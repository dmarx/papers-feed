ngpus = 32
halfngpus = ngpus//2
print('<algo name="Jun" nchunksperloop="{}" nchannels="1">'.format(halfngpus))
for i in range(ngpus):
    print('    <gpu id="{}">'.format(i))
    if i < halfngpus:
        print('        <tb id="0" send="{}" recv="{}" chan="0">'.format((i+1) % halfngpus, (i+halfngpus-1) % halfngpus))
        for j in range(halfngpus):
            offset = ((i+halfngpus-1-j) % halfngpus)
            if j == 0:
                print('            <step s="{}" type="s" srcbuf="i" srcoff="{}" dstbuf="i" dstoff="{}" depid="-1" deps="-1" hasdep="0" />'.format(j, offset, offset))
            elif j == halfngpus-1:
                print('            <step s="{}" type="rrcbd" srcbuf="i" srcoff="{}" dstbuf="i" dstoff="{}" depid="-1" deps="-1" hasdep="1" />'.format(j, offset, offset))
            else:
                print('            <step s="{}" type="rrs" srcbuf="i" srcoff="{}" dstbuf="i" dstoff="{}" depid="-1" deps="-1" hasdep="0" />'.format(j, offset, offset))
        print('        </tb>')
        print('        <tb id="1" send="{}" recv="-1" chan="0">'.format(i+halfngpus))
        print('            <step s="0" type="s" srcbuf="i" srcoff="{}" dstbuf="i" dstoff="{}" depid="0" deps="{}" hasdep="0" />'.format(i,i,halfngpus-1))
        print('        </tb>')
        print('    </gpu>')

    else:
        print('        <tb id="0" send="{}" recv="{}" chan="0">'.format(((i+1) % halfngpus)+halfngpus, ((i+halfngpus-1) % halfngpus)+halfngpus))
        for j in range(halfngpus):
            offset = ((i+halfngpus-j) % halfngpus)
            if j == 0:
                print('            <step s="{}" type="s" srcbuf="i" srcoff="{}" dstbuf="i" dstoff="{}" depid="1" deps="0" hasdep="0" />'.format(j, offset, offset))
            elif j == halfngpus-1:
                print('            <step s="{}" type="r" srcbuf="i" srcoff="{}" dstbuf="i" dstoff="{}" depid="-1" deps="-1" hasdep="0" />'.format(j, offset, offset))
            else:
                print('            <step s="{}" type="rcs" srcbuf="i" srcoff="{}" dstbuf="i" dstoff="{}" depid="-1" deps="-1" hasdep="0" />'.format(j, offset, offset))
        print('        </tb>')
        print('        <tb id="1" send="-1" recv="{}" chan="0">'.format(i%halfngpus))
        print('            <step s="0" type="r" srcbuf="i" srcoff="{}" dstbuf="i" dstoff="{}" depid="-1" deps="-1" hasdep="1" />'.format(i%halfngpus,i%halfngpus))
        print('        </tb>')
        print('    </gpu>')
print('</algo>')