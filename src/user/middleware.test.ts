import request from 'supertest';
import express, { Express } from 'express';
import { user } from './middleware.js';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('@prisma/client', () => {
  const originalModule = jest.requireActual('@prisma/client');

  return {
    __esModule: true,
    ...originalModule,
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          isAdmin: false,
        }),
      },
    })),
  };
});

let app: Express;

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.get('/test', user(), (req, res) => {
    console.log(req.user);
    res.status(200).json({ message: 'Access granted' });
  });
  app.get('/admin-only', user({ adminsOnly: true }), (req, res) => {
    console.log(req.user);
    res.status(200).json({ message: 'Admin only access' });
  });
});

describe('authentication middleware', () => {
  it('should allow authorized user access', async () => {
    const { verify } = require('jsonwebtoken');
    verify.mockImplementationOnce(() => ({ id: 1 }));
    const response = await request(app).get('/test').set('Authorization', 'Bearer test_token');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Access granted' });
  });

  it('should deny access without token', async () => {
    const response = await request(app).get('/test');
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      message: 'Tienes que ingresar sesión para acceder a este recurso.',
    });
  });

  it('should allow access when optional is true and no token is provided', async () => {
    app.get('/optional-test', user({ optional: true }), (req, res) => {
      console.log(req.user);
      res.status(200).json({ message: 'Optional access' });
    });

    const response = await request(app).get('/optional-test');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Optional access' });
  });

  it('should deny access with invalid token', async () => {
    jest.mock('jsonwebtoken', () => ({
      verify: jest.fn().mockImplementationOnce(() => {
        throw new Error('invalid token');
      }),
    }));

    const response = await request(app).get('/test').set('Authorization', 'Bearer invalid_token');
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ message: 'Su sesión ha expirado' });
  });

  it('should deny access to non-admin user for admin-only route', async () => {
    const { verify } = require('jsonwebtoken');
    verify.mockImplementationOnce(() => ({ id: 1 }));
    const response = await request(app)
      .get('/admin-only')
      .set('Authorization', 'Bearer test_token');
    expect(response.statusCode).toBe(403);
    expect(response.body).toEqual({
      message: 'No tiene permiso para acceder a este recurso.',
    });
  });
});
