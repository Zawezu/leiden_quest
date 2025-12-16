from Map import Map
from flask import Flask, request, jsonify, wrappers
from flask_cors import CORS
import os

app = Flask(__name__, static_folder="static")
CORS(app)


# initialize the map object globally so that it can be used dynamically by the server, 
# when static sends requests with updated player position
# the second line is added for testing purposes and not needed for the actual server
game = Map("website/map_graph.json")

def send_start(data: dict) -> wrappers.Response:
    """
    Sends the start and end to the UI in a JSON file
    Keep tracks of the round to reset start and end when needed

    :return (JSON): The starting data required to initiate the game.
    """
    game.game_init()
    
    return jsonify({"start": game.start, 
                    "end": game.end, 
                    "neighbours": game.get_neighbours_and_roads(game.start),
                    })

def send_neighbours(data: dict[str]) -> wrappers.Response:
    """
    Calls generate neighbours and sends to the UI a JSON file with them.

    :param data (dict): The current game data.

    :return (JSON): The neighbours of the current node.
    """
    return jsonify({"neighbours": game.get_neighbours_and_roads(data["current"])})


@app.route("/")
def index():
    return app.send_static_file("game.html")

@app.route('/main', methods=['POST'])
def main()-> tuple[wrappers.Response, int] | wrappers.Response:
    """
    Processes the inputs from the webpage.

    :return (JSON): The results of the input processing.
    """
    data = request.get_json()
    
    if data["type"] == "start":
        return send_start(data)
    elif data["type"] == "neighbours":
        return send_neighbours(data)
 
    
    return jsonify({"error" : "The data is not a JSON or the format is invalid"}), 400


if __name__ == "__main__":
    # run the server, open it on all ports


    # @app.route("/360_images/<path:filename>")
    # def images(filename):
    #     return send_from_directory("../static/360_images", filename)
    port = int(os.environ.get("PORT", 8000))
    app.run(debug=True, host='0.0.0.0', port=port)

   