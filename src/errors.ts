const UNREGISTERED_USER = {
    "code": "UNREGISTERED_USER",
    "message": "El correo electrónico no está registrado.",
};

const UNAUTHENTICATED = {
    "code": "UNAUTHENTICATED",
    "message": "No has ingresado sesión.",
};

const UNVALIDATED = {
    "code": "UNVALIDATED",
    "message": "Debes validar tu correo electrónico antes de iniciar sesión.",
};

const TOKEN_EXPIRED = {
    "code": "TOKEN_EXPIRED",
    "message": "Este link ha expirado, pide uno nuevo.",
};

const INCORRECT_PASSWORD = {
    "code": "INCORRECT_PASSWORD",
    "message": "La contraseña o usuario son incorrectos.",
};

const UNKOWN_ERROR = {
    "code": "UNKOWN_ERROR",
    "message": "Ocurrió un error desconocido.",
};

const UNKOWN_ERROR_CREATE_USER = {
    "code": "UNKOWN_ERROR_CREATE_USER",
    "message": "Ocurrió un error creando el usuario.",
};

const USER_NOT_FOUND = {
    "code": "USER_NOT_FOUND",
    "message": "El usuario no fue encontrado.",
};


const UNAUTHORIZED = {
    "code": "UNAUTHORIZED",
    "message": "No tienes permiso para acceder a este recurso",
};

const BAD_REQUEST = {
    "code": "BAD_REQUEST",
    "message": "Bad request",
};

const INVALID_EMAIL = {
    "code": "INVALID_EMAIL",
    "message": "El correo electrónico no es válido."
};
const INVALID_PASSWORD = {
    "code": "INVALID_PASSWORD",
    "message": "La contraseña debe de tener una longitud minima de 8 caracteres, además de contener minimo una letra mayúscula, una minúscula, un número."
};

const USER_ALREADY_EXISTS = {
    "code": "USER_ALREADY_EXISTS",
    "message": "Ese correo electrónico ya está registrado, intenta ingresando sesión."
};

const NOT_FOUND = {
    "code": "NOT_FOUND",
    "message": "El recurso no fue encontrado.",
};

const MISSING_ID = {
    "code": "MISSING_ID",
    "message": "El campo `id` es obligatorio.",
};

const INTERNAL_SERVER = {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Ocurrió un error en el servidor.",
};

const ALREADY_VALIDATED = {
    "code": "ALREADY_VALIDATED",
    "message": "El correo electrónico para este usuario ya fue validado, intenta ingresar.",

};

const EMAIL_COULD_NOT_BE_SENT = {
    "code": "EMAIL_COULD_NOT_BE_SENT",
    "message": "El correo de verificación no se pudo enviar.",
};

const SUBMISSION_NOT_FOUND = {

    "code": "SUBMISSION_NOT_FOUND",
    "message": "No se pudo encontrar una submission para el usuario.",

};



export default {
    USER_ALREADY_EXISTS, NOT_FOUND, UNAUTHENTICATED,
    UNREGISTERED_USER, INVALID_EMAIL, INVALID_PASSWORD,
    INCORRECT_PASSWORD, UNKOWN_ERROR,
    USER_NOT_FOUND, UNAUTHORIZED, BAD_REQUEST, UNVALIDATED,
    MISSING_ID, TOKEN_EXPIRED, INTERNAL_SERVER, ALREADY_VALIDATED,
    EMAIL_COULD_NOT_BE_SENT, SUBMISSION_NOT_FOUND,
    UNKOWN_ERROR_CREATE_USER,
};