# Leaderboard service

Implements an efficient read/write auto-adjusting leaderboard backed by DynamoDB.

Originally based on https://github.com/Ruberik/google-app-engine-ranklist

Modifications:

- Python tuples generally converted to spread arrays
- Javascript version of Python array equality and range function
- Use DynamoDB instead of Firestore for storage
- Safe batching of writes
- Using debounce queue instead of transaction decorators
- Separately keeps track of a leaderboard as well as a ranking tree
- Scores support additional meta data past name and value

TODOS:

- Needs a safe write lock for updating a leaderboard to enable scaling
- Needs Lambda deployment manifest
- SNS subscription for reading scores, to enable a private feed for the producer

# Supported endpoint

/leaderboard/{experience}/{period}

The currently supported variables:

_experience_ will be the different leaderboards being tracked, e.g. potatoes, arena, bed_wars, etc....

_period_ will probably be `alltime`, `daily`, or `weekly`
