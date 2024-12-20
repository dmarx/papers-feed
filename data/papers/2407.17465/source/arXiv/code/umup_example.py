import unit_scaling as uu
import unit_scaling.functional as U

model = uu.Linear(20, 10)
opt = uu.optim.AdamW(model.parameters(), lr=1.0)
opt.zero_grad()
U.mse_loss(model(input_), target).backward()
opt.step()
