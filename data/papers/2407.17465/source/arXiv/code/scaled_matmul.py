
a = scale(A)
b = scale(B)
A = to_fp8(A / a)
B = to_fp8(B / b)
C = (a * b) * matmul(A, B)

