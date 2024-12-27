x = torch.randn(2**20, requires_grad=True)
y = hardtanh(x, None)
y.backward(torch.randn_like(y))
assert abs(y.std() - 1) < 0.01
assert abs(x.grad.std() - 1) < 0.01
