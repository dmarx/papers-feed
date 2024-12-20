import torch
from math import e, erf, pi, sqrt
from unit_scaling.constraints import apply_constraint
from unit_scaling.scale import scale_fwd, scale_bwd

def hardtanh(x, constraint="to_output_scale"):
    y_scale = 1 / sqrt(1 - sqrt(2/(pi*e)))
    grad_scale = 1 / sqrt(erf(1/sqrt(2)))
    y_scale, grad_scale = apply_constraint(constraint, y_scale, grad_scale)
    x = scale_bwd(x, grad_scale)
    y = torch.nn.functional.hardtanh(x)
    return scale_fwd(y, y_scale)
