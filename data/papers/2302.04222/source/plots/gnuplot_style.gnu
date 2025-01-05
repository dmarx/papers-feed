set macro
set terminal postscript enhanced eps color "Helvetica" 26

unset title
set size 1, 0.8

my_line_width = '7'
large_line_width = '10'

set style line 1 lc rgb "black" linewidth @my_line_width linetype 1 pointtype 1
set style line 2 lc rgb "black" linewidth @large_line_width linetype 0 pointtype 0
set style line 3 lc rgb "black" linewidth @my_line_width linetype 3 pointtype 3
set style line 4 lc rgb "black" linewidth @my_line_width linetype 4 pointtype 4
set style line 5 lc rgb "black" linewidth @my_line_width linetype 5 pointtype 5

set datafile separator '\t'

unset logscale
unset key
unset grid
