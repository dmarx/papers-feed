(TeX-add-style-hook
 "experiments"
 (lambda ()
   (LaTeX-add-labels
    "sec:experiments"
    "subsec:benchmark_attn"
    "fig:benchmark_attn_fwd_bwd"
    "fig:benchmark_attn_fwd"
    "fig:benchmark_attn_bwd"
    "fig:benchmark_attn_fwd_bwd_h100"
    "subsec:end_to_end"
    "table:end_to_end"))
 :latex)

