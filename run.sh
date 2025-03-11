#!/bin/bash

SERVER_FILE="src/server.js"
FUNCTION_FILE=""
PORT=3000

show_help() {
    echo "Usage: ./run.sh [options]"
    echo ""
    echo "Options:"
    echo "  -f, --function FILE           Specify a custom function file"
    echo "  -fn, --function-name NAME     Specify which function to use (default: hello)"
    echo "  -p, --port PORT               Specify the server port (default: 3000)"
    echo "  -h, --help                    Display this help message"
    echo ""
    echo "Available Functions:"
    echo "  hello                  A simple greeting function"
    echo "  fibonacci              Calculate Fibonacci numbers"
    echo "  factorial              Calculate factorial of a number"
    echo "  matrixMultiplication   Perform matrix multiplication"
    echo "  httpRequest            Make an HTTP request to an external API"
    echo "  countPrime             Count prime numbers up to a limit"
    echo "  deepRecursion          Test recursive function calls"
    echo "  sortLargeArray         Sort a large array of random numbers"
    echo ""
    echo "Examples:"
    echo "  ./run.sh                                     # Run with default function"
    echo "  ./run.sh -fn fibonacci                       # Run the fibonacci function"
    echo "  ./run.sh -fn httpRequest -p 8080            # Run httpRequest on port 8080"
}

FUNCTION_NAME=""

while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -f|--function)
            FUNCTION_FILE="$2"
            shift
            shift
            ;;
        -fn|--function-name)
            FUNCTION_NAME="$2"
            shift
            shift
            ;;
        -p|--port)
            PORT="$2"
            shift
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

export PORT=$PORT

CMD="node $SERVER_FILE"

# Handle function file if specified
if [ -n "$FUNCTION_FILE" ]; then
    # Handle different path patterns
    if [[ "$FUNCTION_FILE" == src/* ]]; then
        # Path already includes src/ prefix, use as is
        FUNCTION_PATH="$FUNCTION_FILE"
    else
        # Add src/ prefix for paths that don't already have it
        FUNCTION_PATH="src/$FUNCTION_FILE"
    fi
    
    # Check if file exists
    if [ ! -f "$FUNCTION_PATH" ]; then
        echo "Error: Function file '$FUNCTION_PATH' does not exist"
        exit 1
    fi
    
    CMD="$CMD --function $FUNCTION_PATH"
fi

# Add function name if specified
if [ -n "$FUNCTION_NAME" ]; then
    CMD="$CMD --function-name $FUNCTION_NAME"
fi

echo "Running: $CMD"
echo "Server will be available at http://localhost:$PORT"

eval $CMD