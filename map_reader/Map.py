import json
import networkx as nx
import random
import matplotlib.pyplot as plt
from queue import PriorityQueue
from networkx import adjacency_graph

# DataType short-hands for readability
Node = tuple[float, float]
Road = list[Node]
Corners = tuple[Node, Node]


class Map:
    """
    The Map class is used to create a game scenario based on a graph and the player's position. It contains
    the start and end nodes, and the player's current position.
    It is also able to process the player's inputs to change the player's position in real time using process_inputs().

    :attr serial (int): Random number to simulate game instance ID.
    :attr Graph (nx.Graph): Graph representing the current game map.
    :attr start (Node): Starting position of current round.
    :attr end (Node): Ending position of current round.
    """

    def __init__(self, graph_file: str) -> None:
        """
        Initializes the Map object, by giving it a random serial number and creating a graph to be used in the future.
        It also declares all the object variables that will be used in later methods.

        :param graph_file (str): The name/directory of a cleaned json file containing the graph info.

        :return (None):
        """
        # Random number chosen as the game serial number
        self.serial: int = random.randint(0, 200)

        try:
            self.Graph: nx.Graph = Map._create_graph(graph_file)
        except Exception as e:
            raise e

        # Values declared and reset in the game initiation
        self.start: Node = (-1, -1)
        self.end: Node = (-1, -1)

        self.history: dict[Node, tuple[Node, float]] = {}

    def game_init(self) -> None:
        """
        Game initialization method, creates a new game scenario in the same Map object, this reduces the power
        consumption as the files are already read and only the basic variables need updating.

        :return (None):
        """
        # Print the Map object serial number to know which is used in case of multiple game instances
        print(self.serial)

        # Reset the player and goal to random locations
        self.start, self.end = self.generate_start_end()

    @staticmethod
    def _create_graph(graph_file: str) -> nx.Graph:
        """
        A static method that creates a connected graph used in the Map object by reading a cleaned json file.

        :param graph_file (str): The name/directory of the cleaned json file containing the graph info.

        :return (nx.Graph): The NetworkX Graph created.
        """
        # Very basic error handling
        if not graph_file.endswith('.json'):
            raise ValueError("The file is not a json file")

        # Data collection and sorting
        try:
            with open(graph_file) as f:
                data: dict = json.load(f)  # Read the json data to fill the new graph object
        except Exception as e:
            raise e

        # Tuples are not native json data types
        # Therefore the coordinates in nodes and edges need to be transformed from lists to tuples
        for node in data["nodes"]:
            node["id"] = tuple(node["id"])

        for adj_list in data["adjacency"]:  # The adjacency (edge) list contains multiple lists,
            for edge in adj_list:  # Each list contains a list of connections from a node
                edge["id"] = tuple(edge["id"])
                new_road = []
                for step in edge["road"]:  # Each node in the connection needs to be turned into a tuple
                    new_road.append(tuple(step))
                edge["road"] = new_road

        # Create the graph using the data-type corrected data
        graph: nx.Graph = adjacency_graph(data, directed=False, multigraph=False, attrs={'id': 'id', 'key': 'key'})

        return graph

    def generate_start_end(self, min_distance: int = 100, theta: int = 1000) -> Corners:
        """
        Generates a random tuple of start and end nodes, if they match the distance then they are returned, otherwise
        the distance factor is reduced until a valid pair is found.

        :param min_distance (int): The preferred minimum distance between the starting and ending nodes.
        :param theta (int): The accuracy of the distance between the starting and ending nodes.

        :return (tuple): A tuple of start and end nodes.
        """
        # Get nodes list
        nodes: list[Node] = list(self.Graph.nodes)
        if len(nodes) < 2:
            raise Exception("Map does not have enough nodes to generate a starting and ending point.")
        if min_distance < 0:
            raise Exception("Cannot have negative distance.")

        # Decrease minimum distance until valid pair is found or minimum distance is 0
        for i in range(min_distance+1):
            start: Node
            end: Node
            start, end = random.sample(nodes, 2)
            # Valid node pair is found, return it
            if self.calculate_cartesian_distance(start, end) * theta >= min_distance-i:
                return start, end

        raise Exception("An unknown error has occurred.")

    @staticmethod
    def clean_edge(edge: Road, start_node: Node) -> Road:
        """
        The edges in the graph are undirected, so we need to make sure that the edge is in the right direction.
        This method reverses the edge if the start node is closer to the last node in the edge than the first node.

        :param edge (Road): The edge to be cleaned.
        :param start_node (Node): The start node of the path.

        :return (Road): The cleaned edge.
        """
        # Calculate the distance to either side of the road from the node
        distance_to_first: float = Map.calculate_cartesian_distance(start_node, edge[0])
        distance_to_last: float = Map.calculate_cartesian_distance(start_node, edge[-1])

        # Flip the direction of the road if needed
        if 1 < len(edge) and distance_to_last < distance_to_first:
            edge = edge[::-1]

        return edge

    def get_neighbours_and_roads(self, root: Node) -> list[tuple[Node, Road]]:
        """
        Finds the 50 nearest neighbors of a node using breadth-first search,
        and combines those neighbors with the roads that lead to them.

        :param current (Node): The current node.
        :return (list): List of tuples containing (neighbour, road_to_neighbour).
        """
        neighbour_and_roads: list[tuple[Node, Road]] = []
        root: Node = tuple(root)
        explored_neighbours = {root}

        neighbour_queue = []
        remaining_queue = []
        for neighbour in list(self.Graph.neighbors(root)):
            neighbour_queue.append((root, [], neighbour, 0))

        while len(neighbour_and_roads) < 50 and (neighbour_queue or remaining_queue):  # Stop if queue is empty
            if neighbour_queue:
                current, path_so_far, neighbour, depth = neighbour_queue.pop(0)
                if depth > 4:
                    remaining_queue.append((neighbour, edge, rec_neighbour, depth + 1))
                    continue
            else:
                current, path_so_far, neighbour, depth = remaining_queue.pop(0)
            print(len(neighbour_and_roads))
            # Skip if already explored
            if neighbour in explored_neighbours:
                continue
             
            explored_neighbours.add(neighbour)

            # Get the edge from current to this neighbour (direct connection in graph)
            if neighbour in self.Graph.neighbors(current):
                edge: Road = path_so_far + Map.clean_edge(self.Graph[current][neighbour]["road"], current)
                neighbour_and_roads.append((neighbour, edge))

            # Add all nearby neighbours to the queue
            for rec_neighbour in list(self.Graph.neighbors(neighbour)):
                if rec_neighbour not in explored_neighbours:
                    neighbour_queue.append((neighbour, edge, rec_neighbour, depth + 1))


        return neighbour_and_roads

    @staticmethod
    def calculate_cartesian_distance(node1: Node, node2: Node) -> float:
        """
        Calculates the cartesian distance between two coordinates to a high precision.

        :param node1 (Node): A tuple containing the coordinates of the first node.
        :param node2 (Node): A tuple containing the coordinates of the second node.

        :return (float): A float representing the cartesian distance between the two nodes.
        """
        return ((node1[0] - node2[0]) ** 2 + (node1[1] - node2[1]) ** 2)**0.5

    def __repr__(self):
        """
        Default string representation.

        :return (str): The basic information of current instance.
        """
        return (f"Start: {self.start}, End:{self.end}")

    @staticmethod
    def _visualize(graph, path: Road = None) -> None:
        """
        Visualizes a graph and highlights a particular path if provided.

        :param path (Road): List of nodes representing the path to be highlighted.

        :return (None):
        """

        pos = {node: node for node in graph.nodes()}  # Use node coordinates as positions
        plt.figure(figsize=(10, 10))

        # Draw the graph
        nx.draw(graph, pos, with_labels=True, node_size=5, node_color='lightblue', font_size=1, font_weight='bold')

        # Highlight the path if provided
        if path:
            path_edges = list(zip(path, path[1:]))
            nx.draw_networkx_nodes(graph, pos, nodelist=path, node_color='green', node_size=8)
            nx.draw_networkx_edges(graph, pos, edgelist=path_edges, edge_color='green', width=2)
