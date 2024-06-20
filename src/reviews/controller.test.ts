import express from 'express';
import request from 'supertest';
import router from './routes';

const app = express();
app.use(express.json());
app.use('/reviews', router);

// review
const mockReviewFindMany = jest.fn();
const mockReviewFindUnique = jest.fn();
const mockReviewCreate = jest.fn();

// others
const mockJwtVerify = jest.fn();
const mockSendMail = jest.fn();
const mockUserFindFirst = jest.fn();
const mockUserFindUnique = jest.fn();

const testUserId = '5da23d04-986f-4104-84f3-ce933d58ea64';

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
            review: {
                findMany: () => mockReviewFindMany(),
                findUnique: () => mockReviewFindUnique(),
                create: () => mockReviewCreate(),
            },
            user: {
                findFirst: () => mockUserFindFirst(),
                findUnique: () => mockUserFindUnique(),
            }
        })),

    };
});

describe('GET /reviews', () => {
    it('should return all reviews', async () => {
        const mockReviews = [{ id: '1', rating: 5, comment: 'test' }];
        mockReviewFindMany.mockResolvedValue(mockReviews);

        const response = await request(app).get('/reviews');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockReviews);
    });
});

describe('GET /reviews/:id', () => {
    it('should return a review by its ID', async () => {
        const mockReview = { id: '1', rating: 5, comment: 'test' };
        mockReviewFindUnique.mockResolvedValue(mockReview);
        const response = await request(app).get('/reviews/1');
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockReview);
    });

    it('should return an error if the review is not found', async () => {
        mockReviewFindUnique.mockResolvedValue(null);
        const response = await request(app).get('/reviews/1');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ error: 'Review not found' });
    });
});

describe('POST /reviews', () => {
    it('should return an error if create fails', async () => {
        mockReviewCreate.mockRejectedValue(new Error('Unknown error'));
        mockJwtVerify.mockReturnValue({ id: testUserId });
        mockUserFindFirst.mockResolvedValue({ id: testUserId });

        const response = await request(app)
            .post('/reviews')
            .send({ rating: 5, comment: 'test', reviewedUserId: testUserId, publicationId: '1' })
            .set('Authorization', 'Bearer test_token');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ error: "Unknown error" });
    });

    it('should create a new review', async () => {
        const mockReview = { id: '1', rating: 5, comment: 'test' };
        mockReviewCreate.mockResolvedValueOnce(mockReview);
        mockJwtVerify.mockReturnValue({ id: testUserId });
        mockUserFindFirst.mockResolvedValue({ id: testUserId });

        const response = await request(app)
            .post('/reviews')
            .send({ rating: 5, comment: 'test', reviewedUserId: testUserId, publicationId: '1' })
            .set('Authorization', 'Bearer test_token');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockReview);
    });

    it('should return an error if the user is not authenticated', async () => {
        const mockReview = { id: '1', rating: 5, comment: 'test' };
        mockReviewCreate.mockResolvedValueOnce(mockReview);
        mockUserFindFirst.mockResolvedValue({ isAdmin: true });

        const response = await request(app)
            .post('/reviews')
            .send({ rating: 5, comment: 'test', reviewedUserId: testUserId, publicationId: '1' })
            .set('Authorization', 'Bearer test_token');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: "Internal server error" });
    });
});

describe('GET /reviews/received/:id', () => {
    it('should return all reviews received by a user', async () => {
        const mockReviews = [{ id: '1', rating: 5, comment: 'test' }];
        mockUserFindFirst.mockResolvedValue({ id: testUserId });
        mockUserFindUnique.mockResolvedValue({ id: testUserId, ReviewsReceived: mockReviews });

        const response = await request(app).get(`/reviews/received/${testUserId}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockReviews);
    });
});

describe('GET /reviews/given/:id', () => {
    it('should return all reviews given by a user', async () => {
        const mockReviews = [{ id: '1', rating: 5, comment: 'test' }];
        mockUserFindFirst.mockResolvedValue({ id: testUserId });
        mockUserFindUnique.mockResolvedValue({ id: testUserId, ReviewsGiven: mockReviews });

        const response = await request(app).get(`/reviews/given/${testUserId}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockReviews);
    });
});

describe('GET /reviews/rating/:id', () => {
    it('should return the rating of a user', async () => {
        const mockReviews = [{ id: '1', rating: 5, comment: 'test' }];
        mockUserFindFirst.mockResolvedValue({ id: testUserId });
        mockUserFindUnique.mockResolvedValue({ id: testUserId, ReviewsReceived: mockReviews });

        const response = await request(app).get(`/reviews/rating/${testUserId}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ "average": 5 });
    });

    it('should return rating 0 if no reviews are found', async () => {
        mockUserFindFirst.mockResolvedValue({ id: testUserId });
        mockUserFindUnique.mockResolvedValue({ id: testUserId, ReviewsReceived: null });

        const response = await request(app).get(`/reviews/rating/${testUserId}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ "average": 0 });
    });
});