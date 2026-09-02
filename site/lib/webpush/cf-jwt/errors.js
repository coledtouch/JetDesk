/* eslint-disable max-classes-per-file */
class CustomError extends Error {}
const Status = { PERMISSION_DENIED: 7 };
export class PermissionError extends CustomError {
    code = Status.PERMISSION_DENIED;
}
export class ValidationError extends CustomError {
    code = Status.PERMISSION_DENIED;
}
