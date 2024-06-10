import express from 'express';
import request from 'supertest';
import userRouter from './controller';
import errors from '../errors';
import { Prisma } from '@prisma/client';

const app = express();
app.use(express.json());
app.use('/user', userRouter);

const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockFindFirst = jest.fn();
const mockSendMail = jest.fn();
const mockArgonVerify = jest.fn();
const mockJwtVerify = jest.fn();
const mockUpdate = jest.fn();

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
          { id: 1, isAdmin: true },
          { id: 2, isAdmin: false },
        ]),
        findFirst: () => mockFindFirst(),
        create: () => mockCreate(),
        delete: () => mockDelete(),
        update: () => mockUpdate(),
      },
    })),
  };
});

describe('POST /login', () => {
  it('should login successfully', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 1,
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
      id: 1,
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
    mockJwtVerify.mockReturnValueOnce({ id: 1 });
    mockFindFirst.mockResolvedValue({ id: 1, isAdmin: true });
    const response = await request(app).get('/user/1').set('Authorization', 'Bearer test_token');
    expect(response.statusCode).toBe(200);
    expect(response.body.user).toEqual({ id: 1, isAdmin: true });
  });

  it('should return 404 if user is not found', async () => {
    mockJwtVerify.mockReturnValueOnce({ id: 1 });
    mockFindFirst.mockResolvedValueOnce({ id: 1, isAdmin: true });
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
    mockJwtVerify.mockReturnValueOnce({ id: 1 });
    mockFindFirst.mockResolvedValue({ id: 1, isAdmin: true });
    mockDelete.mockResolvedValue({ id: 1 });
    const response = await request(app).delete('/user/1').set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(200);
  });

  it('should return 404 if user is not found', async () => {
    mockJwtVerify.mockReturnValueOnce({ id: 1 });
    mockFindFirst.mockResolvedValueOnce({ id: 1, isAdmin: true });
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
    mockJwtVerify.mockReturnValueOnce({ id: 1 });
    mockFindFirst.mockResolvedValueOnce({ id: 1, isAdmin: true });
    const response = await request(app).get('/user').set('Authorization', 'Bearer test_token');
    expect(response.statusCode).toBe(200);
    expect(response.body.users).toHaveLength(2);
  });
});

describe('GET /me', () => {
  it('should return user data', async () => {
    mockJwtVerify.mockReturnValueOnce({ id: 1 });
    mockFindFirst.mockResolvedValueOnce({ id: 1, isAdmin: true });
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
    mockUpdate.mockResolvedValue({ id: 1, email: 'test@example.com' });
    mockJwtVerify.mockReturnValueOnce({ id: 1 });
    const response = await request(app)
      .post('/user/change-password')
      .send({ token: 'test_token', password: 'newPassword' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      user: { id: 1, email: 'test@example.com' },
    });
  });

  it('should return 500 if an unknown error occurs', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 1,
      token: 'test@example.com',
      password: 'hashedPassword',
    });
    mockArgonVerify.mockResolvedValueOnce(true);
    mockUpdate.mockRejectedValue({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error en el servidor.',
    });
    mockJwtVerify.mockReturnValueOnce({ id: 1 });
    const response = await request(app)
      .post('/user/change-password')
      .send({ token: 'test_token', password: 'newPassword' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error en el servidor.',
    });
  });
});

describe('POST /verify', () => {
  it('should verify the user succesfully', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 1,
      token: 'test@example.com',
      password: 'hashedPassword',
    });
    mockArgonVerify.mockResolvedValueOnce(true);
    mockUpdate.mockResolvedValue({ id: 1, email: 'test@example.com', isValid: true });
    mockJwtVerify.mockReturnValueOnce({ id: 1 });
    const response = await request(app).post('/user/verify').send({ token: 'test_token' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      user: { id: 1, email: 'test@example.com', isValid: true },
    });
  });

  it('it should return 500 if an unknown error occurs', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 1,
      token: 'test@example.com',
      password: 'hashedPassword',
    });
    mockArgonVerify.mockResolvedValueOnce(true);
    mockUpdate.mockRejectedValueOnce({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error en el servidor.',
    });
    mockJwtVerify.mockReturnValueOnce({ id: 1 });
    const response = await request(app).post('/user/verify').send({ token: 'test_token' });
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error en el servidor.',
    });
  });
});

describe('PATCH /', () => {
  it('should update the user succesfully if its your own profile', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 1,
      token: 'test@example.com',
      password: 'hashedPassword',
    });
    mockUpdate.mockResolvedValue({ id: 1, name: 'newName' });
    mockJwtVerify.mockReturnValueOnce({ id: 1 });
    const response = await request(app)
      .patch('/user')
      .send({ id: 1, password: 'hashedPassword', name: 'newName' })
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      user: { id: 1, name: 'newName' },
    });
  });

  it('should return 401 if you are not authorized', async () => {
    const response = await request(app)
      .patch('/user')
      .send({ id: 1, password: 'hashedPassword', name: 'newName' });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: 'Tienes que ingresar sesión para acceder a este recurso.',
    });
  });

  it('should return a 400 error if bad request', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 1,
      token: 'test@example.com',
      password: 'hashedPassword',
    });
    mockUpdate.mockRejectedValueOnce(new Error('Bad request'));
    mockJwtVerify.mockReturnValueOnce({ id: 1 });
    const response = await request(app)
      .patch('/user')
      .send({ id: 1, password: 'hashedPassword', name: 'newName' })
      .set('Authorization', 'Bearer test_token');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'BAD_REQUEST',
      message: 'Bad request',
    });
  });
});
