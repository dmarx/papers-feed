import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

def bar_chat_1_4B_pythia_vs_zyda():
    # Models
    #models = ['Pythia 1.4b', 'Zyda 1.4b']
    models = ['Zyda 1.4b', 'Pythia 1.4b']
    # Evaluation metrics
    eval_metrics = ['arc_challenge', 'arc_easy', 'logiqa', 'piqa', 'sciq', 'winogrande']

    # Scores
    #scores = [[0.26, 0.606, 0.21, 0.711, 0.865, 0.573], [0.2781569966, 0.625, 0.2150537634, 0.7426550598, 0.877, 0.5714285714]]
    scores = [[0.2781569966, 0.625, 0.2150537634, 0.7426550598, 0.877, 0.5714285714],[0.26, 0.606, 0.21, 0.711, 0.865, 0.573]]

    # Bar width
    barWidth = 0.25

    # Set position of bar on X axis
    r1 = np.arange(len(scores[0]))
    r2 = [x + barWidth for x in r1]
    
    fig, ax = plt.subplots()
    ax.spines['right'].set_visible(False)
    ax.spines['top'].set_visible(False)

    # Make the plot
    plt.bar(r1, scores[0], color='r', width=barWidth, edgecolor='grey', label=models[0])
    plt.bar(r2, scores[1], color='b', width=barWidth, edgecolor='grey', label=models[1])

    # Add xticks on the middle of the group bars
    plt.xlabel('Evaluation Metrics', fontsize=12)#, fontweight='bold')
    plt.ylabel("Score",fontsize=12)
    plt.xticks([r + barWidth/2 for r in range(len(scores[0]))], eval_metrics)

    # Create legend & Show graphic
    plt.title("Zyda vs Pile performance on Pythia 1.4b")
    plt.legend()
    plt.savefig("Zyda_1_4b_bar.png", format="png")
    plt.show()
    
    
    

def ablations_410m_barchart():

    # Define your data
    data = {
        'eval': ['arc_challenge', 'arc_easy', 'boolq', 'hellaswag', 'lambada_openai', 'logiqa', 'logiqa2', 'openbookqa', 'piqa', 'sciq', 'winogrande'],
        'pythia_410m_lsh_0.4_untied': [0.2303754266, 0.5307239057, 0.5724770642, 0.3700458076, 0.4847661556, 0.2058371736, 0.227735369, 0.19, 0.6947769314, 0.827, 0.543804262],
        'pythia_410m_lsh_0.8_untied': [0.2201365188, 0.537037037, 0.5825688073, 0.3668591914, 0.4737046381, 0.2319508449, 0.2245547074, 0.168, 0.6860718172, 0.829, 0.5177584846],
        'pythia_410m_no_filter_no_dedup_untied': [0.2175767918, 0.5269360269, 0.6018348624, 0.3668591914, 0.4671065399, 0.2181259601, 0.2118320611, 0.188, 0.7023939064, 0.808, 0.5272296764]
    }

    # Convert the dictionary into DataFrame
    df = pd.DataFrame(data)

    # Set the figure size
    #plt.figure(figsize=[15,8])
    fig, ax = plt.subplots(figsize=(15,8))
    ax.spines['right'].set_visible(False)
    ax.spines['top'].set_visible(False)

    # Define the bar width
    barWidth = 0.25

    # Set position of bar on X axis
    r1 = np.arange(len(df['pythia_410m_lsh_0.4_untied']))
    r2 = [x + barWidth for x in r1]
    r3 = [x + barWidth for x in r2]

    # Make the plot
    plt.bar(r1, df['pythia_410m_lsh_0.4_untied'], color='b', width=barWidth, edgecolor='grey', label='pythia_410m_lsh_0.4_untied')
    plt.bar(r2, df['pythia_410m_lsh_0.8_untied'], color='r', width=barWidth, edgecolor='grey', label='pythia_410m_lsh_0.8_untied')
    plt.bar(r3, df['pythia_410m_no_filter_no_dedup_untied'], color='g', width=barWidth, edgecolor='grey', label='pythia_410m_no_filter_no_dedup_untied')

    # Adding xticks
    plt.xlabel('Evaluation')#, fontweight='bold')
    plt.ylabel('Score')#, fontweight='bold')
    plt.xticks([r + barWidth for r in range(len(df['pythia_410m_lsh_0.4_untied']))], df['eval'], rotation=45)

    # Create legend & Show graphic
    plt.title("Effect of different deduplication thresholds")
    plt.legend()
    plt.savefig("Deduplication_ablations.png", format="png")
    plt.show()
    
    
def pythia_zyda_scaling_plot():
    # model sizes
    sizes = ['1.4B', '410m', '160m']

    # scores for each model
    pythia_scores = [0.5375, 0.495, 0.465]
    zyda_scores = [0.5714285714, 0.505, 0.472]

    # width of a bar
    barWidth = 0.3

    # setting position of bar on X axis
    r1 = np.arange(len(pythia_scores))
    r2 = [x + barWidth for x in r1]
    
    fig, ax = plt.subplots(figsize=(10,6))
    ax.spines['right'].set_visible(False)
    ax.spines['top'].set_visible(False)

    # Make the plot
    plt.bar(r1, zyda_scores, color='red', width=barWidth, edgecolor='grey', label='Zyda')
    plt.bar(r2, pythia_scores, color='blue', width=barWidth, edgecolor='grey', label='Pythia')

    # Adding xticks
    plt.xlabel('Model Size',fontsize=12)
    plt.ylabel('Aggregate score', fontsize=12)
    plt.xticks([r + barWidth/2 for r in range(len(pythia_scores))], sizes)
    plt.title("Aggregate score Zyda vs Pythia across scales")

    plt.legend()
    plt.savefig("zyda_pythia_scaling_plot.png", format="png")
    plt.show()
    
def ablations_plot():
    # Your data
   # Your data
   # Acc
#     data = {
#         'c4': 0.5032581748,
#         'zyda': 0.5071015492,
#         'zyda_no_starcoder': 0.5134122419,
#         'refinedweb': 0.512758853,
#         'slimpajama': 0.5125710839,
#  #       'raw zyda': 0.5062666885,
#     }
    # acc norm data
    data = {
            'c4': 0.503,
            'zyda': 0.512,
            'zyda_no_starcoder': 0.517,
            'refinedweb': 0.514,
            'slimpajama': 0.509,
            'zyda raw': 0.509,
        }

    

    # Create a new figure
    #plt.figure(figsize=(10, 6))
    fig, ax = plt.subplots(figsize=(10,6))
    ax.spines['right'].set_visible(False)
    ax.spines['top'].set_visible(False)
    # Create a bar chart
    plt.bar(list(data.keys()), list(data.values()), edgecolor='black', color='lightblue')

    # Add labels and title
    plt.ylabel('Aggregate Score',fontsize=12)
    plt.xlabel('Ablation Type',fontsize=12)
    plt.title('Ablation Type vs Score')
    plt.ylim(bottom=0.48)

    # Rotate x labels for better visibility
    plt.xticks(rotation=10)

    # Show the plot
    plt.title("Dataset Ablations: 1.4B, 50GT")
    plt.tight_layout()
    plt.savefig("ablations_plots_acc_norm.png", format="png")
    plt.show()
    
    
def deduplication_ablations():

    evals = ['arc_challenge', 'arc_easy', 'boolq', 'hellaswag', 'lambada', 
            'logiqa', 'logiqa2', 'openbookqa', 'piqa', 'sciq', 'winogrande']
    LSH_40 = [0.2414675768, 0.5660774411, 0.6116207951, 0.3949412468, 0.522220066, 
            0.2135176651, 0.2290076336, 0.188, 0.7198041349, 0.855, 0.5303867403]
    LSH_80 = [0.2329351536, 0.5686026936, 0.6009174312, 0.394045011, 0.5189210169, 
            0.2181259601, 0.2226463104, 0.202, 0.7176278564, 0.859, 0.5295974743]

    x = np.arange(len(evals))  # the label locations
    width = 0.35  # the width of the bars

    fig, ax = plt.subplots()

    rects1 = ax.bar(x - width/2, LSH_40, width, label='LSH 40%')
    rects2 = ax.bar(x + width/2, LSH_80, width, label='LSH 80%')

    # Add some text for labels, title and custom x-axis tick labels, etc.
    ax.set_ylabel('Score',fontsize=12)
    ax.set_title('Scores by deduplication threshold across evals')
    ax.set_xticks(x)
    plt.xlabel("Evaluation Metric",fontsize=12)
    ax.set_xticklabels(evals,rotation=25,fontsize=10)
    ax.legend()
    
    ax.spines['right'].set_visible(False)
    ax.spines['top'].set_visible(False)

    fig.tight_layout()
    plt.savefig("deduplication_threshold_ablations.png", format="png")
    plt.show()
            
if __name__ == '__main__':
    #bar_chat_1_4B_pythia_vs_zyda()
    #ablations_410m_barchart()
    #pythia_zyda_scaling_plot()
    #ablations_plot()
    deduplication_ablations()