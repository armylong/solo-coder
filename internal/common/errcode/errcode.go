package errcode

import "fmt"

type ErrorCode int

const (
	CodeSuccess ErrorCode = 0

	CodeInvalidParam     ErrorCode = 40001
	CodeUnauthorized     ErrorCode = 40101
	CodePermissionDenied ErrorCode = 40301
	CodeNotFound         ErrorCode = 40401
	CodeInternal         ErrorCode = 50001
	CodeAlreadyExists    ErrorCode = 40901
)

type Error struct {
	Code    ErrorCode `json:"code"`
	Message string    `json:"message"`
	Err     error     `json:"-"`
}

func (e *Error) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *Error) Unwrap() error {
	return e.Err
}

func New(code ErrorCode, message string) *Error {
	return &Error{
		Code:    code,
		Message: message,
	}
}

func Newf(code ErrorCode, format string, args ...interface{}) *Error {
	return &Error{
		Code:    code,
		Message: fmt.Sprintf(format, args...),
	}
}

func Wrap(code ErrorCode, message string, err error) *Error {
	return &Error{
		Code:    code,
		Message: message,
		Err:     err,
	}
}

func InvalidParam(message string) *Error {
	return New(CodeInvalidParam, message)
}

func InvalidParamf(format string, args ...interface{}) *Error {
	return Newf(CodeInvalidParam, format, args...)
}

func Unauthorized(message string) *Error {
	return New(CodeUnauthorized, message)
}

func PermissionDenied(message string) *Error {
	return New(CodePermissionDenied, message)
}

func NotFound(message string) *Error {
	return New(CodeNotFound, message)
}

func NotFoundf(format string, args ...interface{}) *Error {
	return Newf(CodeNotFound, format, args...)
}

func Internal(message string, err error) *Error {
	return Wrap(CodeInternal, message, err)
}

func AlreadyExists(message string) *Error {
	return New(CodeAlreadyExists, message)
}
