reset
load '../gnuplot_style.gnu'
#set terminal eps transparent enhanced font "Times,7" fontscale 0.3

set size 1, 0.8

set output 'clip_perturbation.eps'

set xlabel 'LPIPS Perturbation Budget (p)'
set ylabel 'CLIP distance'

set xrange [0 : 0.21]
set xtics 0, 0.05, 0.21
set mxtic 2

set yrange [0 : 0.065]
set ytics 0, 0.02, 0.1

set grid x

set key right bottom

# set label "Target Style" at 0.136, 0.072 tc rgb 'brown'
# set arrow from 0.0,0.066 to 0.21,0.066 nohead ls 2 linewidth 9 linecolor rgb 'brown'

set style fill transparent solid 0.2 noborder

plot 'data/clip_perturbation.txt' using 1:2 with linespoints linestyle 1 pointtype 2 pointsize 2 linecolor rgb 'black' title 'Current artists', \
'data/clip_perturbation.txt' using 1:3 with linespoints linestyle 2 pointtype 9 pointsize 2 linecolor rgb 'blue' title 'Historical artists', \

exit
