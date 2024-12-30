
set title
set xlabel "angle of geodesic $\\gamma$"
set ylabel "PGA loss $f(\\gamma)$"
set terminal epslatex color colortext size 5,2.75
set output "gp/plotpga.tex"
set style line 1 linecolor rgb '#0060ad' linetype 1 linewidth 2
set style line 2 linecolor rgb '#000000' linetype 1 linewidth 3
set style line 3 linecolor rgb '#FF0000' linetype 1 pointsize 2 pt 7
set xrange [-0.8:7]
set yrange [5:12]
set xtics ("0" 0, "$\\pi/2$" 1.5708, "$\\pi$" 3.1416, "$3\\pi/2$" 4.7124, "2$\\pi$" 6.2832)
set samples 1000
set key samplen 0

norm2(xi, yi) = xi**2 + yi**2
pgah(t, xi, yi) = 0.25 * (acosh(1 + 8*(norm2(xi, yi) * sin(t - atan2(yi, xi))**2)/((1 - norm2(xi, yi))**2))**2)

f(t) = pgah(t, 0.8, 0) + pgah(t, -0.8, 0) + pgah(t, 0, 0.7) + pgah(t, 0, -0.7)

set arrow from 3.1,5.5 to (1.5708+0.05),(f(1.5708)-0.1) filled ls 2
set arrow from 3.9,6 to (4.7124-0.05),(f(4.7124)-0.1) filled ls 2
show arrow

set label "non-global minima" at 3.2,5.5

plot f(x) with lines ls 1 notitle, '-' with points ls 3 title "global minima"
0 6
3.1416 6
6.2832 6
e

