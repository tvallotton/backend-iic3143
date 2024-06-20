import express from 'express';
import request from 'supertest';
import router from './routes';

const app = express();
app.use(express.json());
app.use('/publications', router);

// publication
const mockPublicationFindMany = jest.fn();
const mockPublicationFindUnique = jest.fn();
const mockPublicationCreate = jest.fn();
const mockPublicationUpdate = jest.fn();
const mockPublicationDelete = jest.fn();

// others
const mockJwtVerify = jest.fn();
const mockUserFindFirst = jest.fn();
const mockSendMail = jest.fn();

// publication interaction
const mockInteractionUpsert = jest.fn();
const mockInteractionUpdate = jest.fn();
const mockInteractionFindMany = jest.fn();
const mockInteractionFindUnique = jest.fn();


jest.mock('jsonwebtoken', () => {
  const originalModule = jest.requireActual('jsonwebtoken');
  function JsonWebTokenError(this: any, message: any) {
    this.name = 'JsonWebTokenError';
    this.message = message;
  }
  JsonWebTokenError.prototype = Object.create(Error.prototype);

  return {
    ...originalModule,
    JsonWebTokenError: JsonWebTokenError,
    verify: () => mockJwtVerify(),
    sign: jest.fn().mockImplementation(() => 'test_token'),
  };
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: () => mockSendMail(),
  }),
}));


jest.mock('@prisma/client', () => {
  const originalModule = jest.requireActual('@prisma/client');

  return {
    __esModule: true,
    ...originalModule,
    PrismaClient: jest.fn().mockImplementation(() => ({
      publication: {
        findMany: () => mockPublicationFindMany(),
        findUnique: () => mockPublicationFindUnique(),
        create: () => mockPublicationCreate(),
        update: () => mockPublicationUpdate(),
        delete: () => mockPublicationDelete(),
      },
      user: {
        findFirst: () => mockUserFindFirst(),
      },
      publicationInteraction: {
        upsert: () => mockInteractionUpsert(),
        update: () => mockInteractionUpdate(),
        findMany: () => mockInteractionFindMany(),
        findUnique: () => mockInteractionFindUnique(),
      }
    })),
  };
});

describe('GET /publications', () => {
  it('should return all publications with their owners', async () => {
    const mockPublications = [
      {
        id: "88b14b0e-32c8-4acc-bef8-6ebd8866b020",
        title: 'Test Publication 1',
        owner: {
          name: 'Test Owner 1',
        },
      },
      {
        id: "a94fa831-e00a-4cf3-9016-f815b89ad792",
        title: 'Test Publication 2',
        owner: {
          name: 'Test Owner 2',
        },
      },
    ];

    mockPublicationFindMany.mockResolvedValue(mockPublications);
    const response = await request(app).get('/publications');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: "88b14b0e-32c8-4acc-bef8-6ebd8866b020",
        title: 'Test Publication 1',
        owner: {
          name: 'Test Owner 1',
        },
      },
      {
        id: "a94fa831-e00a-4cf3-9016-f815b89ad792",
        title: 'Test Publication 2',
        owner: {
          name: 'Test Owner 2',
        },
      },
    ]);
  });

  it('should handle errors', async () => {
    mockPublicationFindMany.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/publications');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ error: 'Database error' });
  });
});

describe('GET /publications/:id', () => {
  it('should return a publication by its ID with the owner name', async () => {
    const mockPublication = {
      id: "8101b88f-2a7e-47df-a198-48e6caddf928",
      title: 'Test Publication 1',
      owner: {
        name: 'Test Owner 1',
      },
    };

    mockPublicationFindUnique.mockResolvedValue(mockPublication);
    const response = await request(app).get('/publications/8101b88f-2a7e-47df-a198-48e6caddf928');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "8101b88f-2a7e-47df-a198-48e6caddf928",
      title: 'Test Publication 1',
      owner: 'Test Owner 1',
    });
  });

  it('should handle errors', async () => {
    mockPublicationFindUnique.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/publications/32-2a7e-47df-a198-48e6caddf928');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ error: 'Database error' });
  });

  it('should return publication not found', async () => {
    mockPublicationFindUnique.mockResolvedValue(null);

    const response = await request(app).get('/publications/1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ error: 'Publication not found' });
  });
});

describe('POST /publications', () => {
  it('should create a new publication', async () => {
    const mockPublication = {
      title: 'Test Publication 1',
      author: 'Test Author',
      language: 'English',
      genres: ['Genre1', 'Genre2'],
      bookState: 'New',
      description: 'This is a test publication',
      type: 'Hardcover',
      price: 10.0,
      image: 'test_image.png',
      bookId: '12345',
      id: "c07019c1-9984-41f4-8e02-c84fb7ab3e60",
      owner: {
        name: 'Test Owner 1',
      },
    };
    mockJwtVerify.mockReturnValueOnce({ id: "c07019c1-9984-41f4-8e02-c84fb7ab3e60" });
    mockUserFindFirst.mockResolvedValue({ id: "c07019c1-9984-41f4-8e02-c84fb7ab3e60", isAdmin: true });
    mockPublicationCreate.mockResolvedValue(mockPublication);
    const response = await request(app)
      .post('/publications')
      .send({
        title: 'Test Publication 1',
        author: 'Test Author',
        language: 'English',
        genres: ['Genre1', 'Genre2'],
        bookState: 'New',
        description: 'This is a test publication',
        type: 'Hardcover',
        price: 10.0,
        image: 'test_image.png',
        bookId: '12345',
      })
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockPublication);
  });

  it('should ask for a token', async () => {
    const response = await request(app).post('/publications');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Tienes que ingresar sesión para acceder a este recurso.' });
  });

  it('should handle errors', async () => {
    mockJwtVerify.mockReturnValue({ id: 1 });
    mockPublicationCreate.mockRejectedValue(new Error('Unkown error'));

    const response = await request(app)
      .post('/publications')
      .set('Authorization', 'Bearer invalid_token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ error: 'Unkown error' });
  });

  it('should create a publication with no price', async () => {
    const mockPublication = {
      title: 'Test Publication 1',
      author: 'Test Author',
      language: 'English',
      genres: ['Genre1', 'Genre2'],
      bookState: 'New',
      description: 'This is a test publication',
      type: 'Hardcover',
      price: 0,
      image: 'test_image.png',
      bookId: '12345',
      id: "c07019c1-9984-41f4-8e02-c84fb7ab3e60",
      owner: {
        name: 'Test Owner 1',
      },
    };

    mockJwtVerify.mockReturnValue({ id: "c07019c1-9984-41f4-8e02-c84fb7ab3e60" });
    mockPublicationCreate.mockResolvedValue(mockPublication);
    const response = await request(app)
      .post('/publications')
      .send({
        title: 'Test Publication 1',
        author: 'Test Author',
        language: 'English',
        genres: ['Genre1', 'Genre2'],
        bookState: 'New',
        description: 'This is a test publication',
        type: 'Hardcover',
        price: '',
        image: 'test_image.png',
        bookId: '12345',
      })
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockPublication);
  });
});

describe('PUT /publications/:id', () => {
  it('should update a publication', async () => {
    const mockPublication = {
      id: "ee786f25-460e-49f8-ab97-559e164d5230",
      title: 'Test title 1',
      owner: {
        name: 'Test Owner 1',
      },
      ownerId: "6ee3c6c6-22df-42b3-9e05-cce441843382",
    };
    mockPublicationFindUnique.mockResolvedValueOnce(mockPublication);
    mockUserFindFirst.mockResolvedValue({ id: "6ee3c6c6-22df-42b3-9e05-cce441843382", isAdmin: true });
    mockJwtVerify.mockReturnValue({ id: "6ee3c6c6-22df-42b3-9e05-cce441843382" });
    mockPublicationUpdate.mockResolvedValue({
      ...mockPublication,
      title: 'New Title',
    });
    const response = await request(app)
      .put('/publications/ee786f25-460e-49f8-ab97-559e164d5230')
      .send({ title: 'New Title' })
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...mockPublication,
      title: 'New Title',
    });
  });
  it('should handle errors', async () => {
    const mockPublication = {
      id: 1,
      title: 'Test title 1',
      owner: {
        name: 'Test Owner 1',
      },
      ownerId: "6ee3c6c6-22df-42b3-9e05-cce441843382",
    };
    mockPublicationFindUnique.mockResolvedValueOnce(mockPublication);
    mockPublicationUpdate.mockRejectedValue(new Error('Unkown error'));
    mockJwtVerify.mockReturnValue({ id: "6ee3c6c6-22df-42b3-9e05-cce441843382" });
    mockUserFindFirst.mockResolvedValue({ id: "6ee3c6c6-22df-42b3-9e05-cce441843382", isAdmin: true });
    const response = await request(app)
      .put('/publications/1')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Unkown error' });
  });

  it('should return publication not found', async () => {
    mockPublicationFindUnique.mockResolvedValue(null);
    mockJwtVerify.mockReturnValue({ id: 1 });
    const response = await request(app)
      .put('/publications/1')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Publication doesn't exist" });
  });

  it('should return unauthorized', async () => {
    const mockPublication = {
      id: 1,
      title: 'Test title 1',
      owner: {
        name: 'Test Owner 1',
      },
      ownerId: 2,
    };
    mockPublicationFindUnique.mockResolvedValueOnce(mockPublication);
    mockJwtVerify.mockReturnValue({ id: 1 });
    const response = await request(app)
      .put('/publications/1')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "You don't have permission to update this publication",
    });
  });

  it('should ask for a token', async () => {
    const response = await request(app).put('/publications/1');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Tienes que ingresar sesión para acceder a este recurso.' });
  });
});

describe('DELETE /publications/:id', () => {
  it('should delete a publication', async () => {
    const mockPublication = {
      id: 1,
      title: 'Test title 1',
      owner: {
        name: 'Test Owner 1',
      },
      ownerId: "5da23d04-986f-4104-84f3-ce933d58ea64",
    };
    mockPublicationFindUnique.mockResolvedValueOnce(mockPublication);
    mockJwtVerify.mockReturnValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64" });
    mockUserFindFirst.mockResolvedValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64", isAdmin: true });
    mockPublicationDelete.mockResolvedValue({ message: 'Publication deleted successfully' });
    const response = await request(app)
      .delete('/publications/1')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Publication deleted successfully' });
  });

  it('should handle errors', async () => {
    const mockPublication = {
      id: "53358c00-6ada-4592-8f56-1e0ba30ed087",
      title: 'Test title 1',
      owner: {
        name: 'Test Owner 1',
      },
      ownerId: "5da23d04-986f-4104-84f3-ce933d58ea64",
    };
    mockPublicationFindUnique.mockResolvedValueOnce(mockPublication);
    mockPublicationDelete.mockRejectedValue(new Error('Unkown error'));
    mockJwtVerify.mockReturnValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64" });
    mockUserFindFirst.mockResolvedValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64", isAdmin: true });
    const response = await request(app)
      .delete('/publications/53358c00-6ada-4592-8f56-1e0ba30ed087')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Unkown error' });
  });

  it('should return publication not found', async () => {
    mockPublicationFindUnique.mockResolvedValue(null);
    mockJwtVerify.mockReturnValue({ id: 1 });
    const response = await request(app)
      .delete('/publications/1')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "You don't have permission to delete this publication",
    });
  });

  it('should ask for a token', async () => {
    const response = await request(app).delete('/publications/1');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Tienes que ingresar sesión para acceder a este recurso.' });
  });
});

describe('POST /publications/:id/interactions', () => {
  it('should create a new interaction and send email', async () => {
    const mockInteraction = {
      id: "1",
      type: 'trade',
      user: {
        name: 'Test User 1',
        email: 'test@example.com'
      },
      publication: {
        title: 'Test Publication 1',
      },
      updatedAt: new Date(),
    };
    mockPublicationFindUnique.mockResolvedValue({
      id: "1", title: 'Test Publication 1', owner: {
        name: 'Test Owner 1',
        email: 'owner@example.com'
      }
    });
    mockJwtVerify.mockReturnValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64" });
    mockUserFindFirst.mockResolvedValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64", isAdmin: true });
    mockSendMail.mockResolvedValue({ messageId: 'test_message_id' });
    mockInteractionUpsert.mockResolvedValue(mockInteraction);
    mockInteractionUpdate.mockResolvedValue({
      ...mockInteraction, updatedAt: new Date(),
      emailSent: true,
    });
    const response = await request(app)
      .post('/publications/1/interactions')
      .send({ type: 'like' })
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(201);
    expect(response.body.interaction.id).toEqual(mockInteraction.id);
  })

  it('should handle error if no user id in request', async () => {
    const mockInteraction = {
      id: "1",
      type: 'trade',
      user: {
        name: 'Test User 1',
        email: 'test@example.com'
      },
      publication: {
        title: 'Test Publication 1',
      },
      updatedAt: new Date(),
    };
    mockPublicationFindUnique.mockResolvedValue({
      id: "1", title: 'Test Publication 1', owner: {
        name: 'Test Owner 1',
        email: 'owner@example.com'
      }
    });
    mockUserFindFirst.mockResolvedValue({ isAdmin: true });
    mockSendMail.mockResolvedValue({ messageId: 'test_message_id' });
    mockInteractionUpsert.mockResolvedValue(mockInteraction);
    mockInteractionUpdate.mockResolvedValue({
      ...mockInteraction, updatedAt: new Date(),
      emailSent: true,
    });
    const response = await request(app)
      .post('/publications/1/interactions')
      .send({ type: 'like' })
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal server error" });
  });

  it('should handle error if no publication found', async () => {
    mockPublicationFindUnique.mockResolvedValue(null);
    mockJwtVerify.mockReturnValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64" });
    mockUserFindFirst.mockResolvedValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64", isAdmin: true });
    mockSendMail.mockResolvedValue({ messageId: 'test_message_id' });
    const response = await request(app)
      .post('/publications/1/interactions')
      .send({ type: 'like' })
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(404);
  });

  it('should handle error if owner id is the same as user id', async () => {
    mockPublicationFindUnique.mockResolvedValue({
      id: "1",
      title: 'Test Publication 1',
      ownerId: "5da23d04-986f-4104-84f3-ce933d58ea64",
      owner: {
        name: 'Test Owner 1',
        email: 'owner@example.com',
      }
    });
    mockJwtVerify.mockReturnValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64" });
    mockUserFindFirst.mockResolvedValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64", isAdmin: true });
    mockSendMail.mockResolvedValue({ messageId: 'test_message_id' });
    const response = await request(app)
      .post('/publications/1/interactions')
      .send({ type: 'like' })
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "You can't interact with your own publication" });
  });
});

describe('GET /publications/:id/interactions', () => {
  it('should return all interactions of a publication', async () => {
    mockJwtVerify.mockReturnValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64" });
    mockUserFindFirst.mockResolvedValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64", isAdmin: true })
    mockPublicationFindUnique.mockResolvedValue({
      id: "1",
      title: 'Test Publication 1',
      owner: {
        name: 'Test Owner 1',
      }
    });
    const mockInteractions = [
      {
        id: "1", user: { name: 'Test User 1' }, publication: { title: 'Test Publication 1' },
      },
      {
        id: "2", user: { name: 'Test User 2' }, publication: { title: 'Test Publication 1' },
      },
    ];
    mockInteractionFindMany.mockResolvedValue(mockInteractions);
    const response = await request(app)
      .get('/publications/1/interactions')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockInteractions);
  });

  it('should handle error if user id not available', async () => {
    mockUserFindFirst.mockResolvedValue({ isAdmin: true })
    const response = await request(app)
      .get('/publications/1/interactions')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal server error" });
  });
  
  it('should handle error if publication not found', async () => {
    mockJwtVerify.mockReturnValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64" });
    mockUserFindFirst.mockResolvedValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64", isAdmin: true })
    mockPublicationFindUnique.mockResolvedValue(null);
    const response = await request(app)
      .get('/publications/1/interactions')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Publication doesn't exist" });
  });

  it('should handle error if user id is not admin', async () => {
    mockJwtVerify.mockReturnValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64" });
    mockUserFindFirst.mockResolvedValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64", isAdmin: false })
    mockPublicationFindUnique.mockResolvedValue({
      id: "1",
      title: 'Test Publication 1',
      owner: {
        name: 'Test Owner 1',
      }
    });
    const mockInteractions = [
      {
        id: "1", user: { name: 'Test User 1' }, publication: { title: 'Test Publication 1' },
      },
      {
        id: "2", user: { name: 'Test User 2' }, publication: { title: 'Test Publication 1' },
      },
    ];
    mockInteractionFindMany.mockResolvedValue(mockInteractions);
    const response = await request(app)
      .get('/publications/1/interactions')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "You don't have permission to see this publication interactions" });
  });

  it('should handle internal server error if find failed', async () => {
    mockJwtVerify.mockReturnValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64" });
    mockUserFindFirst.mockResolvedValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64", isAdmin: true })
    mockPublicationFindUnique.mockResolvedValue({
      id: "1",
      title: 'Test Publication 1',
      owner: {
        name: 'Test Owner 1',
      }
    });
    mockInteractionFindMany.mockRejectedValue(new Error('Unknown error'));
    const response = await request(app)
      .get('/publications/1/interactions')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Unknown error" });
  });
});

describe('PATCH /publications/interactions/:id', () => {
  it('should complete the publication', async () => {
    mockJwtVerify.mockReturnValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64" });
    mockUserFindFirst.mockResolvedValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64", isAdmin: true })
    mockInteractionFindUnique.mockResolvedValue({
      id: "1", type: 'trade', publicationId: "1", userId: "2",
      publication: { title: 'Test Publication 1', ownerId: "5da23d04-986f-4104-84f3-ce933d58ea64" },
    });
    mockInteractionUpdate.mockResolvedValue({
      id: "1", type: 'trade', publicationId: "1", userId: "2",
      publication: { title: 'Test Publication 1' },
      status: "COMPLETED"
    });
    const response = await request(app)
      .patch('/publications/interactions/1')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({message: 'Interaction completed successfully'});
  });

  it('should handle error if user id is not the same as owner id', async () => {
    mockJwtVerify.mockReturnValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64" });
    mockUserFindFirst.mockResolvedValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64", isAdmin: true })
    mockInteractionFindUnique.mockResolvedValue({
      id: "1", type: 'trade', publicationId: "1", userId: "2",
      publication: { title: 'Test Publication 1', ownerId: "1" },
    });
    mockInteractionUpdate.mockResolvedValue({
      id: "1", type: 'trade', publicationId: "1", userId: "2",
      publication: { title: 'Test Publication 1' },
      status: "COMPLETED"
    });
    const response = await request(app)
      .patch('/publications/interactions/1')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(403);
    expect(response.body).toEqual({error: "You don't have permission to complete this interaction"});
  });

  it('should handle error if user id is not the same as owner id', async () => {
    mockJwtVerify.mockReturnValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64" });
    mockUserFindFirst.mockResolvedValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64", isAdmin: true })
    mockInteractionFindUnique.mockResolvedValue({
      id: "1", type: 'trade', publicationId: "1", userId: "2",
      publication: { title: 'Test Publication 1', ownerId: "5da23d04-986f-4104-84f3-ce933d58ea64" },
    });
    mockInteractionUpdate.mockRejectedValue(new Error('Unknown error'));
    const response = await request(app)
      .patch('/publications/interactions/1')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({error: "Unknown error"});
  });

  it('should handle error if publication doesnt exist', async () => {
    mockJwtVerify.mockReturnValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64" });
    mockUserFindFirst.mockResolvedValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64", isAdmin: true })
    mockInteractionFindUnique.mockResolvedValue({
      id: "1", type: 'trade', publicationId: "1", userId: "2",
      publication: null,
    });
    const response = await request(app)
      .patch('/publications/interactions/1')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({error: "Interaction or publication doesn't exist"});
  });

  it('should handle error if user id is unavailable', async () => {
    mockUserFindFirst.mockResolvedValue({ isAdmin: true })
    const response = await request(app)
      .patch('/publications/interactions/1')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({error: "Internal server error"});
  });
});
    