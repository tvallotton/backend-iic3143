import express from 'express';
import request from 'supertest';
import router from './routes';

const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockJwtVerify = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

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

jest.mock('@prisma/client', () => {
  const originalModule = jest.requireActual('@prisma/client');

  return {
    __esModule: true,
    ...originalModule,
    PrismaClient: jest.fn().mockImplementation(() => ({
      publication: {
        findMany: () => mockFindMany(),
        findUnique: () => mockFindUnique(),
        create: () => mockCreate(),
        update: () => mockUpdate(),
        delete: () => mockDelete(),
      },
    })),
  };
});

const app = express();
app.use(express.json());
app.use('/publications', router);

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

    mockFindMany.mockResolvedValue(mockPublications);
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
    mockFindMany.mockRejectedValue(new Error('Database error'));

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

    mockFindUnique.mockResolvedValue(mockPublication);
    const response = await request(app).get('/publications/8101b88f-2a7e-47df-a198-48e6caddf928');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "8101b88f-2a7e-47df-a198-48e6caddf928",
      title: 'Test Publication 1',
      owner: 'Test Owner 1',
    });
  });

  it('should handle errors', async () => {
    mockFindUnique.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/publications/32-2a7e-47df-a198-48e6caddf928');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ error: 'Database error' });
  });

  it('should return publication not found', async () => {
    mockFindUnique.mockResolvedValue(null);

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

    mockJwtVerify.mockReturnValue({ id: "c07019c1-9984-41f4-8e02-c84fb7ab3e60" });
    mockCreate.mockResolvedValue(mockPublication);
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
    expect(response.body).toEqual({ error: 'No token provided' });
  });

  it('should handle errors', async () => {
    mockJwtVerify.mockReturnValue({ id: 1 });
    mockCreate.mockRejectedValue(new Error('Unkown error'));

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
      mockCreate.mockResolvedValue(mockPublication);
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
    mockFindUnique.mockResolvedValueOnce(mockPublication);
    mockJwtVerify.mockReturnValue({ id: "6ee3c6c6-22df-42b3-9e05-cce441843382" });
    mockUpdate.mockResolvedValue({
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
      ownerId: 1,
    };
    mockFindUnique.mockResolvedValueOnce(mockPublication);
    mockUpdate.mockRejectedValue(new Error('Unkown error'));
    mockJwtVerify.mockReturnValue({ id: 1 });
    const response = await request(app)
      .put('/publications/1')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Unkown error' });
  });

  it('should return publication not found', async () => {
    mockFindUnique.mockResolvedValue(null);
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
    mockFindUnique.mockResolvedValueOnce(mockPublication);
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
    expect(response.body).toEqual({ error: 'No token provided' });
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
      ownerId: 1,
    };
    mockFindUnique.mockResolvedValueOnce(mockPublication);
    mockJwtVerify.mockReturnValue({ id: 1 });
    mockDelete.mockResolvedValue({ message: 'Publication deleted successfully' });
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
    mockFindUnique.mockResolvedValueOnce(mockPublication);
    mockDelete.mockRejectedValue(new Error('Unkown error'));
    mockJwtVerify.mockReturnValue({ id: "5da23d04-986f-4104-84f3-ce933d58ea64" });
    const response = await request(app)
      .delete('/publications/53358c00-6ada-4592-8f56-1e0ba30ed087')
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Unkown error' });
  });

  it('should return publication not found', async () => {
    mockFindUnique.mockResolvedValue(null);
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
    expect(response.body).toEqual({ error: 'No token provided' });
  });
});
