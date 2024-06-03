import express from 'express';
import request from 'supertest';
import userRouter from './controller';

const app = express();
app.use(express.json());
app.use('/user', userRouter);

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockImplementation(() => ({ id: 1 })),
}));

jest.mock('@prisma/client', () => {
  const originalModule = jest.requireActual('@prisma/client');

  return {
    __esModule: true,
    ...originalModule,
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, isAdmin: true },
          { id: 2, isAdmin: false },
        ]),
        findFirst: jest
          .fn()
          .mockImplementation(({ where: { id } }) =>
            Promise.resolve(
              id === 1 ? { id: 1, isAdmin: true } : id === 2 ? { id: 2, isAdmin: false } : null,
            ),
          ),
      },
    })),
  };
});

describe('GET /:id', () => {
  it('should return user with given id', async () => {
    const response = await request(app).get('/user/1').set('Authorization', 'Bearer test_token');
    expect(response.statusCode).toBe(200);
    expect(response.body.user).toEqual({ id: 1, isAdmin: true });
  });

  it('should return 404 if user is not found', async () => {
    const response = await request(app).get('/user/3').set('Authorization', 'Bearer test_token');
    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ message: 'El usuario no fue encontrado.', code: "USER_NOT_FOUND" });
  });
});
