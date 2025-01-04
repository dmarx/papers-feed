(TeX-add-style-hook
 "algo"
 (lambda ()
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "href")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "hyperref")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "hyperimage")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "hyperbaseurl")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "nolinkurl")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "url")
   (add-to-list 'LaTeX-verbatim-macros-with-braces-local "path")
   (add-to-list 'LaTeX-verbatim-macros-with-delims-local "path")
   (LaTeX-add-labels
    "sec:algo"
    "subsec:algo"
    "alg:flash2_fwd"
    "alg:stream_attn_split_qkv"
    "alg:stream_attn_outer_loop"
    "alg:stream_attn_load_q"
    "alg:stream_attn_init"
    "alg:stream_attn_load_kv"
    "alg:stream_attn_qk"
    "alg:stream_attn_statistics"
    "alg:stream_attn_update"
    "alg:flash_bwd"
    "subsec:parallelism"
    "fig:parallelism"
    "subsec:work_partitioning"
    "fig:partitioning"))
 :latex)

