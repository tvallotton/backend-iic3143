import express from 'express';
import request from 'supertest';
import userRouter from './controller';
import errors from '../errors.js';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/user', userRouter);

const userId1 = "d994e015-3776-4d79-9248-367dc0c981b1";
const userId2 = "d994e015-3776-4d79-9248-367dc0c981b2";
const userId3 = "d994e015-3776-4d79-9248-367dc0c981b3";

const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockFindFirst = jest.fn();
const mockSendMail = jest.fn();
const mockArgonVerify = jest.fn();
const mockJwtVerify = jest.fn();
const mockUpdate = jest.fn();

const mockInteractionFindMany = jest.fn();

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  verify: () => mockArgonVerify(),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: () => mockSendMail(),
  }),
}));

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
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: () => userId1, isAdmin: true },
          { id: () => userId2, isAdmin: false },
        ]),
        findFirst: () => mockFindFirst(),
        create: () => mockCreate(),
        delete: () => mockDelete(),
        update: () => mockUpdate(),
      },
      publicationInteraction: {
        findMany: () => mockInteractionFindMany(),
      },
    })),
  };
});

describe('POST /login', () => {
  it('should login successfully', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: userId1,
      email: 'test@example.com',
      password: 'hashedPassword',
    });
    mockArgonVerify.mockResolvedValueOnce(true);
    const response = await request(app)
      .post('/user/login')
      .send({ email: 'test@example.com', password: 'hashedPassword' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('authorization');
  });

  it('should return 401 if the email is not registered', async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const response = await request(app)
      .post('/user/login')
      .send({ email: 'notregistered@example.com', password: 'password' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(errors.UNREGISTERED_USER);
  });

  it('should return 401 if the password is incorrect', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: userId1,
      email: 'test@example.com',
      password: 'hashedPassword',
    });
    mockArgonVerify.mockResolvedValueOnce(false);
    const response = await request(app)
      .post('/user/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(errors.INCORRECT_PASSWORD);
  });

  it('should return 400 if the email or password is not a string', async () => {
    const response = await request(app)
      .post('/user/login')
      .send({ email: 123, password: ['not', 'a', 'string'] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: 'error',
      es: 'Las credenciales tiene un formato invalido.',
      en: 'Credentials have an invalid type',
    });
  });
});

describe('GET /:id', () => {
  it('should return user with given id', async () => {
    mockJwtVerify.mockReturnValueOnce({ id: userId1 });
    mockFindFirst.mockResolvedValue({ id: userId1, isAdmin: true });
    const response = await request(app).get('/user/d994e015-3776-4d79-9248-367dc0c981b1').set('Authorization', 'Bearer test_token');
    expect(response.statusCode).toBe(200);
    expect(response.body.user).toEqual({ id: userId1, isAdmin: true });
  });

  it('should return 404 if user is not found', async () => {
    mockJwtVerify.mockReturnValueOnce({ id: userId1 });
    mockFindFirst.mockResolvedValueOnce({ id: userId1, isAdmin: true });
    mockFindFirst.mockResolvedValue(null);
    const response = await request(app).get('/user/3').set('Authorization', 'Bearer test_token');
    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      message: 'El usuario no fue encontrado.',
      code: 'USER_NOT_FOUND',
    });
  });
});

describe('DELETE /id', () => {
  it('should delete the user succesfully', async () => {
    mockJwtVerify.mockReturnValueOnce({ id: userId1 });
    mockFindFirst.mockResolvedValue({ id: userId1, isAdmin: true });
    mockDelete.mockResolvedValue({ id: userId1 });
    const response = await request(app).delete('/user/d994e015-3776-4d79-9248-367dc0c981b1').set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(200);
  });

  it('should return 404 if user is not found', async () => {
    mockJwtVerify.mockReturnValueOnce({ id: userId1 });
    mockFindFirst.mockResolvedValueOnce({ id: userId1, isAdmin: true });
    mockDelete.mockResolvedValue(null);
    const response = await request(app).delete('/user/3').set('Authorization', 'Bearer test_token');
    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      message: 'El usuario no fue encontrado.',
      code: 'USER_NOT_FOUND',
    });
  });
});

describe('GET /', () => {
  it('should return all users', async () => {
    mockJwtVerify.mockReturnValueOnce({ id: userId1 });
    mockFindFirst.mockResolvedValueOnce({ id: userId1, isAdmin: true });
    const response = await request(app).get('/user').set('Authorization', 'Bearer test_token');
    expect(response.statusCode).toBe(200);
    expect(response.body.users).toHaveLength(2);
  });
});

describe('GET /me', () => {
  it('should return user data', async () => {
    mockJwtVerify.mockReturnValueOnce({ id: userId1 });
    mockFindFirst.mockResolvedValueOnce({ id: userId1, isAdmin: true });
    const response = await request(app).get('/user/me').set('Authorization', 'Bearer test_token');
    expect(response.statusCode).toBe(200);
    expect(response.body.user).toEqual({ id: userId1, isAdmin: true });
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
    mockCreate.mockResolvedValueOnce({ id: userId3, email: 'newuser@example.com', password: 'Abcdef12' });
    mockSendMail.mockResolvedValueOnce('Email sent');
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

describe('POST /change-password', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should change password successfully', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 1,
      token: 'test@example.com',
      password: 'hashedPassword',
    });
    mockArgonVerify.mockResolvedValueOnce(true);
    mockUpdate.mockResolvedValue({ id: userId1, email: 'test@example.com' });
    mockJwtVerify.mockReturnValueOnce({ id: userId1 });
    const response = await request(app)
      .post('/user/change-password')
      .send({ token: 'test_token', password: 'newPassword' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      user: { id: userId1, email: 'test@example.com' },
    });
  });

  it('should return 500 if an unknown error occurs', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: userId1,
      token: 'test@example.com',
      password: 'hashedPassword',
    });
    mockArgonVerify.mockResolvedValueOnce(true);
    mockUpdate.mockRejectedValue({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error en el servidor.',
    });
    mockJwtVerify.mockReturnValueOnce({ id: userId1 });
    const response = await request(app)
      .post('/user/change-password')
      .send({ token: 'test_token', password: 'newPassword' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error en el servidor.',
    });
  });

  it('should return 401 if the token is expired', async () => {
    const mockJwt = new jwt.JsonWebTokenError('Mock JWT Error');
    mockJwtVerify.mockImplementation(() => {
      throw mockJwt;
    });
    const response = await request(app)
      .post('/user/change-password')
      .send({ token: 'expired_token', password: 'newPassword' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(errors.TOKEN_EXPIRED);
  });
});

describe('PATCH /', () => {
  it('should remove isAdmin field from request body if the user is not an admin', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: userId1,
      token: 'test_token',
      password: 'hashedPassword',
      isAdmin: false,
    });
    mockUpdate.mockResolvedValue({ id: userId1, name: 'newName' });
    mockJwtVerify.mockReturnValueOnce({ id: userId1 });

    const response = await request(app)
      .patch('/user')
      .send({ id: userId1, password: 'hashedPassword', name: 'newName', isAdmin: false })
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      user: { id: userId1, name: 'newName' },
    });
  });

  it('should update the user succesfully if its your own profile', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: userId1,
      token: 'test@example.com',
      password: 'hashedPassword',
    });
    mockUpdate.mockResolvedValue({ id: userId1, name: 'newName' });
    mockJwtVerify.mockReturnValueOnce({ id: userId1 });
    const response = await request(app)
      .patch('/user')
      .send({ id: userId1, password: 'hashedPassword', name: 'newName' })
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      user: { id: userId1, name: 'newName' },
    });
  });

  it('should return 403 if you are not authorized to update the user', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: userId2,
      token: 'test_token',
      password: 'hashedPassword',
      isAdmin: false,
    });
    mockUpdate.mockResolvedValue({ id: userId1, name: 'newName' });
    mockJwtVerify.mockReturnValueOnce({ id: userId2, isAdmin: false });
    const response = await request(app)
      .patch('/user')
      .send({ id: userId1, password: 'hashedPassword', name: 'newName' })
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(403);
    expect(response.body).toEqual(errors.UNAUTHORIZED);
  });

  it('should return 401 if you are not authorized', async () => {
    const response = await request(app)
      .patch('/user')
      .send({ id: userId1, password: 'hashedPassword', name: 'newName' });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: 'Tienes que ingresar sesión para acceder a este recurso.',
    });
  });

  it('should return a 400 error if bad request', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: userId1,
      token: 'test@example.com',
      password: 'hashedPassword',
    });
    mockUpdate.mockRejectedValueOnce(new Error('Bad request'));
    mockJwtVerify.mockReturnValueOnce({ id: userId1 });
    const response = await request(app)
      .patch('/user')
      .send({ id: userId1, password: 'hashedPassword', name: 'newName' })
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'BAD_REQUEST',
      message: 'Bad request',
    });
  });
});

describe('POST /verify', () => {
  it('should verify the user succesfully', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: userId1,
      token: 'test@example.com',
      password: 'hashedPassword',
    });
    mockArgonVerify.mockResolvedValueOnce(true);
    mockUpdate.mockResolvedValue({ id: userId1, email: 'test@example.com', isValid: true });
    mockJwtVerify.mockReturnValueOnce({ id: userId1 });
    const response = await request(app).post('/user/verify').send({ token: 'test_token' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      user: { id: userId1, email: 'test@example.com', isValid: true },
    });
  });

  it('it should return 500 if an unknown error occurs', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: userId1,
      token: 'test@example.com',
      password: 'hashedPassword',
    });
    mockArgonVerify.mockResolvedValueOnce(true);
    mockUpdate.mockRejectedValueOnce({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error en el servidor.',
    });
    mockJwtVerify.mockReturnValueOnce({ id: userId1 });
    const response = await request(app).post('/user/verify').send({ token: 'test_token' });
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error en el servidor.',
    });
  });

  it('should return 401 if the token is expired', async () => {
    const mockJwt = new jwt.JsonWebTokenError('Mock JWT Error');
    mockJwtVerify.mockImplementation(() => {
      throw mockJwt;
    });

    const response = await request(app)
      .post('/user/verify')
      .send({ token: 'expired_token', password: 'newPassword' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(errors.TOKEN_EXPIRED);
  });
});

describe('GET /interactions', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  it('should return filtered interactions for user', async () => {
    const userInteractions = [
      { id: 1, userId: userId1, publicationId: 1, type: 'trade' },
      { id: 2, userId: userId1, publicationId: 2, type: 'buy' },
    ];

    const othersInteractions = [
      { id: 3, userId: '123', publicationId: 1, status: 'COMPLETED' },
    ];
    mockJwtVerify.mockReturnValueOnce({ id: userId1 });
    mockFindFirst.mockResolvedValueOnce({ isAdmin: true, id: userId1 });
    mockInteractionFindMany.mockResolvedValueOnce(userInteractions);
    mockInteractionFindMany.mockResolvedValueOnce(othersInteractions);

    const response = await request(app)
      .get('/user/interactions')
      .set('Authorization', 'Bearer test_token');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toEqual(
      expect.objectContaining({ id: 2, userId: userId1, publicationId: 2, type: 'buy' })
    );
  });

  it('should handle error if user id is not found', async () => {
    mockJwtVerify.mockReturnValueOnce({ isAdmin: true });
    mockFindFirst.mockResolvedValueOnce({ isAdmin: true });

    const response = await request(app)
      .get('/user/interactions')
      .set('Authorization', 'Bearer test_token');

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });
  });
});

describe("GET /:id/interactions", () => {
  it('should return interactions for the user', async () => {
    const interactions = [
      { id: 1, userId: userId1, publicationId: 1, type: 'trade' },
      { id: 2, userId: userId1, publicationId: 2, type: 'buy' },
    ];

    mockJwtVerify.mockReturnValueOnce({ id: userId1 });
    mockFindFirst.mockResolvedValueOnce({ isAdmin: true, id: userId1 });
    mockInteractionFindMany.mockResolvedValueOnce(interactions);

    const response = await request(app)
      .get(`/user/${userId1}/interactions`)
      .set('Authorization', 'Bearer test_token');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(interactions);
  });
});