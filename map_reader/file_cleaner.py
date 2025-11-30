from json import dump
from geojson import FeatureCollection, Feature, load
from networkx import adjacency_data, Graph, connected_components
from collections import defaultdict

'''
This file should serve the one-time function of cleaning a geojson file and creating a new json file that can be used
in the main program.
The relevant data we want to keep in the json file will be necessary for creating the NetworkX graph and nothing else.
'''

# Used in type hints to improve readability.
Node = tuple[float, float]
Road = list[Node]
Corners = tuple[Node, Node]


def euclidean_dist(node1: Node, node2: Node) -> float:
    """
    Calculate the Euclidean distance between two points.

    :param node1 (Node): The first node coordinates.
    :param node2 (Node): The second node coordinates.

    :return (float): The distance between both nodes.
    """
    return ((node1[0] - node2[0]) ** 2 + (node1[1] - node2[1]) ** 2) ** 0.5


def dist(points: Road) -> float:
    """
    Calculates the length of a road by calculating the euclidean distance between the points along the road.

    :param points (Road): The node points along the road.

    :return (float): The distance to travel if the road is taken.
    """
    return sum(euclidean_dist(points[i], points[i + 1]) for i in range(len(points) - 1))


def to_split(graph: Graph) -> defaultdict[Corners, list[Road | set]]:
    """
    Identify points where there is a node on the road and split the road into two parts to accurately reflect that.

    :param graph (Graph): The graph containing the nodes and edges that should be modified.

    :return (dict): Dictionary of edges to split with keys being edge corners and values being the road and nodes on it.
    """
    split: defaultdict[Corners, list[Road | set]] = defaultdict(lambda: [list(), set()])

    node1: Node
    node2: Node
    data: dict[str, float | Road | bool]
    # Get the start, end, and road of all edges
    for node1, node2, data in graph.edges(data=True):
        road: Road = data.get('road', [])
        # Skip roads that do not have intermediate points
        if len(road) < 3:
            continue

        # Save the nodes that split the road
        node: Node
        for node in road[1:-1]:
            if node in graph.nodes:
                split[(node1, node2)][0] = road  # Assumes it is unique.
                split[(node1, node2)][1].add(node)

    return split


def splitter(graph: Graph, split: defaultdict[Corners, list[list | set]]) -> None:
    """
    Split the edges identified in the to_split function into new edges and add the splitting point to the nodes.

    :param graph (Graph): The graph that contains the nodes and edges to be modified.
    :param split (dict): The dictionary of edges (Roads) to be split as well as the point (Node) to split at.

    :return (None):
    """
    # Go over each edge in the graph that needs to be split
    edge: Corners
    for edge in split:
        # Set basic variables
        new_roads: list[Road] = []  # All the new added roads.
        left: Road = []  # The remainder of the original road after splitting.
        road: Road = split[edge][0]  # The original road.
        nodes: set[Node] = split[edge][1]  # The set of nodes that indicate when to cut.

        # Go over the road, and cut it where necessary, adding the relevant data to the saving variables
        ind: int
        point: Node
        for ind, point in enumerate(road):
            if point in nodes:
                new_roads.append(road[:ind + 1])
                left = road[ind:]

        # If a road was cut, save the original remaining bit
        if left:
            new_roads.append(left)

        # Add the new roads to the graph
        new_road: Road
        for new_road in new_roads:
            graph.add_edge(new_road[0], new_road[-1], dist=dist(new_road), road=new_road)

    # Remove the split edges
    graph.remove_edges_from(split)


def extract_main_component(graph: Graph) -> Graph:
    """
    Deep copies the largest connected subgraph from the provided full graph.

    :param graph (Graph): The original full graph which can be a forest.

    :return (Graph): The main segment which can be the fullest tree.
    """
    # Sort the components by number of connected nodes
    all_connected_components: list = sorted(connected_components(graph), key=len, reverse=True)
    # Select the largest component, this is shared with the original graph
    frozen_graph: Graph = graph.subgraph(all_connected_components[0])
    # Return an independent deep copy of the largest component
    return Graph(frozen_graph)


def joiner(graph: Graph) -> bool:
    """
    Loop over all nodes in the graph and join the separated roads that do not have intersections and remove the
    intermediate node. (L-turns are not valid player positions as they offer no value)

    :param graph: Original graph containing all nodes and roads.

    :return (bool): Whether roads have been merged
    """
    # Determine if a new loop might be necessary
    flag: bool = False

    # Loop over all nodes while getting their degrees
    for node, degree in dict(graph.degree).items():
        # Skip nodes that don't satisfy the basic conditions
        if degree != 2:
            continue
        if len(graph.edges(node)) != 2:
            continue

        # Meets the requirements
        edge1: Corners
        edge2: Corners
        # Get the two road corners this node is part of
        edge1, edge2 = graph.edges(node)
        # Get the neighbouring nodes
        left: Node = edge1[-1]
        right: Node = edge2[-1]

        # Get the road to the neighbouring nodes
        road_left: Road = graph.get_edge_data(node, left, default={}).get('road', [])
        road_right: Road = graph.get_edge_data(node, right, default={}).get('road', [])

        # Orient the roads correctly
        if road_left[0] == node:
            road_left.reverse()
        if road_right[-1] == node:
            road_right.reverse()

        # Merge the roads and add the result to the graph while removing the now redundant node
        new_road: Road = road_left + road_right[1:]
        graph.add_edge(new_road[0], new_road[-1], dist=dist(new_road), road=new_road)
        graph.remove_node(node)

        # Declare that there were modifications
        flag = True

    return flag


def geojson_converter(in_file_name: str) -> Graph:
    """
    Function to extract the roads stored in the geojson file and transpose them into a Graph object.
    IMPORTANT: The node coordinates are switched during this function.

    :param in_file_name (str): The name of the geojson file containing the raw data.

    :return (Graph): The graph containing a direct transposition of the geojson file content.
    """
    # Initialize Graph object
    graph = Graph()

    try:
        with open(in_file_name, "r") as infile:
            # Read the file data and prepare to process it
            gjson: FeatureCollection = load(infile)
            gjson_objs: list[Feature] = gjson["features"]
    except Exception as e:
        raise e

    # Begin data processing
    obj_dict: Feature
    for obj_dict in gjson_objs:
        # If it is a road, save the road coordinates into a list of edges
        if obj_dict["geometry"]["type"] == 'LineString':
            road: Road = [(y, x) for x, y in obj_dict["geometry"]["coordinates"]]
            # Skip circular roads
            if road[0] == road[-1]:
                continue

            # Add the edge to the graph
            graph.add_edge(road[0], road[-1], dist=dist(road), road=road)

    return graph


def file_cleaner(in_file_name: str, out_file_name: str) -> None:
    """
    Function to clean the geojson file and write the clean data to the provided json file name.

    :param in_file_name (str): The name of the file to be cleaned.
    :param out_file_name (str): The name of the file where the clean data should be written.

    :return (None):
    """
    # Open the geojson file and create a graph object
    raw_graph: Graph = geojson_converter(in_file_name)

    # Some roads are not connected to intermediate nodes. Split them into separate edges to connect them to the nodes.
    split: defaultdict[Corners, list[list | set]]
    while split := to_split(raw_graph):
        splitter(raw_graph, split)  # After removing, modify to match.
        
    # Select the most optimal graph to work with (ensure connectivity)
    main_graph: Graph = extract_main_component(raw_graph)

    # Join all continuous roads that do not offer real choice to the player (remove nodes of degree 2)
    while joiner(main_graph):
        continue

    final_graph: Graph = extract_main_component(main_graph)

    # Save the final graph data into json dictionary format
    new_json: dict[str, list] = adjacency_data(final_graph, attrs={'id': 'id', 'key': 'key'})

    # Write to the json destination
    with open(out_file_name, "w") as outfile:
        dump(new_json, outfile)


if __name__ == '__main__':
    file_cleaner("map_reader/raw_map_data.geojson", "map_reader/map_graph.json")
