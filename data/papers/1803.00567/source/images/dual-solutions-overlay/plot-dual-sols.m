Nx=20
Ny=20

r=randomPointinDSimplex(Nx);
c=randomPointinDSimplex(Ny);

X=randn(2,Nx);
Y=randn(2,Ny);

C=pairwiseDistance(X,Y)

[d,T]=mexEMD(r,c,C)

[I,J]=ind2sub([Nx Ny],find(T>0))

A=zeros(Nx+Ny,Nx+Ny)
for i=1:length(I)
    M(i,I(i))=1;
    M(i,J(i))=1;
    b(i)=C(I(i),J(i));
end

ab=M\b;

subplot(1,2,1);
scatter2(X(1,:),X(2,:),r*100,'b')
    
subplot(1,2,1);
scatter2(X(1,:),X(2,:),r*100,'b')

