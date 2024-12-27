
import mup

proxy_model = MupModel(d_model=128, ...)       # proxy width
base_model = MupModel(d_model=256, ...)        # base width
mup.set_base_shapes(proxy_model, base_model)   # re-initialize proxy_model

