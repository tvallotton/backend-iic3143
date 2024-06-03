import express from 'express';
import request from 'supertest';
import userRouter from './controller';
import errors from '../errors';
import { Prisma } from '@prisma/client';

const app = express();
app.use(express.json());
app.use('/user', userRouter);

const mockCreate = jest.fn();

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockImplementation((mailOptions, callback) => {
      console.log('Sending email', mailOptions);
      callback(null);
    }),
  }),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockImplementation(() => ({ id: 1 })),
  sign: jest.fn().mockImplementation(() => 'test_token'),
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
        create: () => mockCreate(),
        delete: jest.fn().mockResolvedValue({}),
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
    expect(response.body).toEqual({
      message: 'El usuario no fue encontrado.',
      code: 'USER_NOT_FOUND',
    });
  });
});

describe('GET /', () => {
  it('should return all users', async () => {
    const response = await request(app).get('/user').set('Authorization', 'Bearer test_token');
    expect(response.statusCode).toBe(200);
    expect(response.body.users).toHaveLength(2);
  });
});

describe('GET /me', () => {
  it('should return user data', async () => {
    const response = await request(app).get('/user/me').set('Authorization', 'Bearer test_token');
    expect(response.statusCode).toBe(200);
    expect(response.body.user).toEqual({ id: 1, isAdmin: true });
  });
});

describe('POST /', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should respond with 400 status for invalid password', async () => {
    const response = await request(app).post('/user').send({
      password: 'abc',
      email: 'test@example.com',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(errors.INVALID_PASSWORD);
  });

  it('should respond with 400 status for invalid email', async () => {
    const response = await request(app).post('/user').send({
      password: 'Abcdef12',
      email: 'invalidemail',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(errors.INVALID_EMAIL);
  });

  it('should create a new user successfully', async () => {
    mockCreate.mockResolvedValueOnce({ id: 3, email: 'newuser@example.com', password: 'Abcdef12' });

    const response = await request(app).post('/user').send({
      password: 'Abcdef12',
      email: 'newuser@example.com',
    });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
    expect(response.body.user.email).toBe('newuser@example.com');
    expect(response.body.user).not.toHaveProperty('password');
  });

  it('should respond with 403 status for duplicate user', async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'A unique constraint would be violated on User. Details: Field name = email',
      {
        code: 'P2002',
        clientVersion: '1.0.0',
        meta: {
          target: ['email'],
        },
      },
    );

    mockCreate.mockRejectedValueOnce(error);

    const response = await request(app).post('/user').send({
      password: 'Abcdef12',
      email: 'test@example.com',
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(errors.USER_ALREADY_EXISTS);
  });

  it('should catch unknown errors during user creation', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Unknown error'));

    const response = await request(app).post('/user').send({
      password: 'Abcdef12',
      email: 'newuser@example.com',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(errors.UNKOWN_ERROR_CREATE_USER);
  });
});
