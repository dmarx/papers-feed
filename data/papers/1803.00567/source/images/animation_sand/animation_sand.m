x=-1:0.01:1

ah = .3*mvnpdf(x',-.3,.001)+.4*mvnpdf(x',-.7,.001)+.3*mvnpdf(x',-.5,.01);
bh=zeros(size(ah));
bh(130:170) = 1;
for j=0:2:6,
    bh(130+5*j:130+5*(j+1)) = 1.3;
end

% ah=histc(a,x); 
% bh=histc(b,x); 
ah(105:end)=0;
ah(1:20)=0;
bh(1:100)=0;
ah=ah/sum(ah);
bh=bh/sum(bh);

amax=max(find(ah>0));
bmin=min(find(bh>0));
figure('Color','white');
ym=ylim;
yM=.06; ym=-.04;
k=1;
v2=VideoWriter('monge2.avi','Uncompressed AVI');
open(v2)
stopnext=0;
while stopnext~=2,
    clf
    line([0,0],[1,0])
    area(x,ah','FaceColor','red'); hold on
    area(x,-bh,'FaceColor','blue'); hold on;
    %bar(-ch,'b');
    ylim([ym,yM]);    
    xlim([-1,.8]);
    axis off
    frame=getframe;
    writeVideo(v2,frame);      
    break
    ah=[0;ah(1:end-1)];
    amax=amax+1;
    if bmin<=amax,
        if ah(amax)<bh(bmin),   
            bh(bmin)=bh(bmin)-ah(amax);
            ah(amax)=0;
            amax=amax-1;
        elseif ah(amax)>bh(bmin),
            ah(amax)=ah(amax)-bh(bmin);
            bh(bmin)=0;
            bmin=bmin+1;
        else
            ah(amax)=0
            bh(bmin)=0
            bmin=bmin+1;
        end                
    end
    if stopnext==1,
        stopnext=2;
    elseif sum(abs(ah))==0,
        stopnext=1;
    end
    
end
close(v2)
