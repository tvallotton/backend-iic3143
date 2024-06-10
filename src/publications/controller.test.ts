import express from 'express';
import request from 'supertest';
import router from './routes';

const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();

jest.mock('@prisma/client', () => {
  const originalModule = jest.requireActual('@prisma/client');

  return {
    __esModule: true,
    ...originalModule,
    PrismaClient: jest.fn().mockImplementation(() => ({
      publication: {
        findMany: () => mockFindMany(),
        findUnique: () => mockFindUnique(),
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
        id: 1,
        title: 'Test Publication 1',
        owner: {
          name: 'Test Owner 1',
        },
      },
      {
        id: 2,
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
        id: 1,
        title: 'Test Publication 1',
        owner: {
          name: 'Test Owner 1',
        },
      },
      {
        id: 2,
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
      id: 1,
      title: 'Test Publication 1',
      owner: {
        name: 'Test Owner 1',
      },
    };

    mockFindUnique.mockResolvedValue(mockPublication);
    const response = await request(app).get('/publications/1');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 1,
      title: 'Test Publication 1',
      owner: 'Test Owner 1',
    });
  });

  it('should handle errors', async () => {
    mockFindUnique.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/publications/1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ error: 'Database error' });
  });
});

