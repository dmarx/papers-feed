# https://github.com/rrtucci/texnn/issues/5
from texnn import *

mosaic = [
    "B_CDEF",
    "_A_GH_",
    "_I_JK_",
    "____M_",
    "NO__P_"
]

nodePi = Node(
    name="\\pi",
    tile_ch='A',
    parent_names=["S_t"],
    style_name="dashed-box",
)


nodeSt = Node(
    name="S_t",
    tile_ch='B',
    parent_names=[],
    style_name="oval"
    
)

nodeP = Node(
    name="P",
    tile_ch='C',
    parent_names=["S_t"],
    style_name="box"
    
)

nodeSt1Pred = Node(
    name="S_{t+1|t}",
    tile_ch='D',
    parent_names=["P"],
    style_name="oval"
    
)

nodeU = Node(
    name="U",
    tile_ch='E',
    parent_names=["S_{t+1|t}", "E"],
    style_name="box"
    
)

nodeSt1 = Node(
    name="S_{t+1}",
    tile_ch='F',
    parent_names=["U"],
    style_name="box"
    
)

nodeD = Node(
    name="D",
    tile_ch='G',
    parent_names=["S_{t+1|t}"],
    style_name="box"
    
)

nodeE = Node(
    name="E",
    tile_ch='H',
    parent_names=["O_{t+1}"],
    style_name="box"
    
)

nodeA = Node(
    name="A_t",
    tile_ch='I',
    parent_names=["\\pi"],
    style_name="oval"
    
)

nodeOt1Pred = Node(
    name="\\hat{O}_{t+1}",
    tile_ch='J',
    parent_names=["D"],
    style_name="oval"
    
)

nodeOt1 = Node(
    name="O_{t+1}",
    tile_ch='K',
    parent_names=["O"],
    style_name="oval"
    
)


nodeO = Node(
    name="O",
    tile_ch='M',
    parent_names=["Z_{t+1}"],
    style_name="dashed-box"
    
)

nodeZt = Node(
    name="Z_t",
    tile_ch='N',
    parent_names=[],
    style_name="oval"
    
)

nodeW = Node(
    name="W",
    tile_ch='O',
    parent_names=["Z_t", "A_t"],
    style_name="dashed-box"
)

nodeZtp1 = Node(
    name="Z_{t+1}",
    tile_ch='P',
    parent_names=["W"],
    style_name="oval"
    
)

nodes = [nodePi,
         nodeSt, nodeP, nodeSt1Pred, nodeU, nodeSt1,
         nodeD, nodeE,
         nodeA, nodeOt1Pred, nodeOt1,
          nodeO,
         nodeZt, nodeW, nodeZtp1]



import pathlib
dir = str(pathlib.Path(__file__).parent.resolve())
name = "agentPGM"
name = dir + "/" + name
print("writing to ", name)
dag = DAG(name, mosaic, nodes)
dag.write_tex_file(underline=False)
