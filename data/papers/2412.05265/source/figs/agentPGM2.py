# https://github.com/rrtucci/texnn/issues/5
from texnn import *

mosaic = [
    "_R___TS",
    "_A____Q",
    "B_CDEF_",
    "___GH__",
    "_I_JK__",
    "____M__",
    "NO__P__"
]

nodePiRL = Node(
    name="\\pi^{RL}",
    tile_ch='T',
    parent_names=["\\theta_t", "s_t", "s_{t+1}"],
    style_name="box"
)

nodeThetaT = Node(
    name="\\theta_t",
    tile_ch='R',
    parent_names=[],
    style_name="oval"
)

nodeThetaTp1 = Node(
    name="\\theta_{t+1}",
    tile_ch='S',
    parent_names=["\\pi^{RL}"],
    style_name="oval"
)


nodePi = Node(
    name="\\pi_t",
    tile_ch='A',
    parent_names=["s_t", "\\theta_t"],
    style_name="dashed-box",
)

nodePiTp1 = Node(
    name="\\pi_{t+1}",
    tile_ch='Q',
    parent_names=["s_{t+1}", "\\theta_{t+1}"],
    style_name="dashed-box",
)


nodeSt = Node(
    name="s_t",
    tile_ch='B',
    parent_names=[],
    style_name="oval"
    
)

nodeP = Node(
    name="P",
    tile_ch='C',
    parent_names=["s_t"],
    style_name="box"
    
)

nodeSt1Pred = Node(
    name="s_{t+1|t}",
    tile_ch='D',
    parent_names=["P"],
    style_name="oval"
    
)

nodeU = Node(
    name="U",
    tile_ch='E',
    parent_names=["s_{t+1|t}", "E"],
    style_name="box"
    
)

nodeSt1 = Node(
    name="s_{t+1}",
    tile_ch='F',
    parent_names=["U"],
    style_name="box"
    
)

nodeD = Node(
    name="D",
    tile_ch='G',
    parent_names=["s_{t+1|t}"],
    style_name="box"
    
)

nodeE = Node(
    name="E",
    tile_ch='H',
    parent_names=["o_{t+1}"],
    style_name="box"
    
)

nodeA = Node(
    name="a_t",
    tile_ch='I',
    parent_names=["\\pi_t"],
    style_name="oval"
    
)

nodeOt1Pred = Node(
    name="\\hat{o}_{t+1}",
    tile_ch='J',
    parent_names=["D"],
    style_name="oval"
    
)

nodeOt1 = Node(
    name="o_{t+1}",
    tile_ch='K',
    parent_names=["O"],
    style_name="oval"
    
)


nodeO = Node(
    name="O",
    tile_ch='M',
    parent_names=["z_{t+1}"],
    style_name="dashed-box"
    
)

nodeZt = Node(
    name="z_t",
    tile_ch='N',
    parent_names=[],
    style_name="oval"
    
)

nodeW = Node(
    name="W",
    tile_ch='O',
    parent_names=["z_t", "a_t"],
    style_name="dashed-box"
)

nodeZtp1 = Node(
    name="z_{t+1}",
    tile_ch='P',
    parent_names=["W"],
    style_name="oval"
    
)

nodes = [nodeThetaT, nodePiRL, nodeThetaTp1,
         nodePi, nodePiTp1,
         nodeSt, nodeP, nodeSt1Pred, nodeU, nodeSt1,
         nodeD, nodeE,
         nodeA, nodeOt1Pred, nodeOt1,
          nodeO,
         nodeZt, nodeW, nodeZtp1]

At_PiRL = FeedbackArrow(
    parent_name="a_t",
    child_name="\\pi^{RL}",
    color="black",
    curvature=-5
)

import pathlib
dir = str(pathlib.Path(__file__).parent.resolve())
name = "agentPGM2"
name = dir + "/" + name
print("writing to ", name)
dag = DAG(name, mosaic, nodes ,
          feedback_arrows=[At_PiRL])
dag.write_tex_file(underline=False)
