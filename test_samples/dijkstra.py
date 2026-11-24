"""
Dijkstra's Shortest Path Algorithm
----------------------------------
Finds the shortest distance and path from a source node to a destination
in a weighted graph with non-negative edge weights.

Run:
    python dijkstra.py
"""

import heapq


def dijkstra(graph, start, destination):
    """Return (shortest_distance, shortest_path) from start to destination."""
    if start not in graph or destination not in graph:
        raise ValueError("Start or destination node does not exist in the graph.")

    distances = {node: float("inf") for node in graph}
    previous = {node: None for node in graph}
    distances[start] = 0

    priority_queue = [(0, start)]

    while priority_queue:
        current_distance, current_node = heapq.heappop(priority_queue)

        # Ignore an outdated queue entry.
        if current_distance > distances[current_node]:
            continue

        if current_node == destination:
            break

        for neighbor, weight in graph[current_node].items():
            if weight < 0:
                raise ValueError("Dijkstra's algorithm does not support negative weights.")

            new_distance = current_distance + weight

            if new_distance < distances[neighbor]:
                distances[neighbor] = new_distance
                previous[neighbor] = current_node
                heapq.heappush(priority_queue, (new_distance, neighbor))

    if distances[destination] == float("inf"):
        return float("inf"), []

    # Reconstruct the shortest path.
    path = []
    node = destination
    while node is not None:
        path.append(node)
        node = previous[node]

    path.reverse()
    return distances[destination], path


def main():
    # Example undirected weighted graph.
    graph = {
        "A": {"B": 4, "C": 2},
        "B": {"A": 4, "C": 1, "D": 5},
        "C": {"A": 2, "B": 1, "D": 8, "E": 10},
        "D": {"B": 5, "C": 8, "E": 2, "F": 6},
        "E": {"C": 10, "D": 2, "F": 3},
        "F": {"D": 6, "E": 3},
    }

    print("DIJKSTRA'S SHORTEST PATH")
    print("Available nodes:", ", ".join(graph))

    start = input("Enter starting node: ").strip().upper()
    destination = input("Enter destination node: ").strip().upper()

    try:
        distance, path = dijkstra(graph, start, destination)

        if not path:
            print(f"No path exists from {start} to {destination}.")
        else:
            print("Shortest path:", " -> ".join(path))
            print("Total distance:", distance)

    except ValueError as error:
        print("Error:", error)


if __name__ == "__main__":
    main()
