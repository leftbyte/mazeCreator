// - - - - - - - - - - - - - - - - - - - - - - -
// maze.js - example maze creator in javascript.
// Author: Dan Phung
//
// Tested using 'node version v0.10.25'
// - - - - - - - - - - - - - - - - - - - - - - -

// Maze creator prototype that encapsulates a grid with cells, each made up of a
// set of north, east, south, or/and west walls.  The main function is run().
var MazeCreator = function(dimX, dimY) {
    // For node, use console.log, v8 = print
    outputfn = console.log;

    // Maze globals
    var g_debugLevel = 3;
    var g_gridDim = [dimX, dimY];
    var g_mazeStart = [0, 0];
    var g_mazeEnd = [Math.floor(dimX / 2), Math.floor(dimY / 2)];
    var g_minBranches = Math.floor(Math.sqrt(g_gridDim[0] * g_gridDim[1]));
    var g_minSlnLen = Math.floor(Math.sqrt(g_gridDim[0] * g_gridDim[1]));

    var UNDEFINED = 0;
    var START     = 1;
    var PATH      = 2;
    var END       = 3;

    var NORTH   = 0;
    var EAST    = 1;
    var SOUTH   = 2;
    var WEST    = 3;
    var NOWHERE = 4;

    var dirToStr = function(dir) {
        switch (dir) {
        case NORTH:
            return "NORTH";
        case EAST:
            return "EAST";
        case SOUTH:
            return "SOUTH";
        case WEST:
            return "WEST";
        default:
            return "NOWHERE";
        }
    };

    var typeToStr = function(t) {
        switch (t) {
        case UNDEFINED:
            return "UNDEFINED";
        case START:
            return "START";
        case END:
            return "END";
        case PATH:
            return "PATH";
        }
    };

    // The way this grid outputs, 0,0 is on the top left and x,x is on the
    // bottom right, so going "North" decrements the index.
    var getEastX = function(x, maxX) {
        return x === maxX - 1 ? 0 : x + 1;
    };
    var getWestX = function(x, maxX) {
        return x === 0 ? maxX - 1: x - 1;
    };
    // Note that North decrements the index to make the printed grid make sense.
    var getNorthY = function(y, maxY) {
        return y === 0 ? maxY - 1 : y - 1;
    };
    var getSouthY = function(y, maxY) {
        return y === maxY - 1 ? 0: y + 1;
    };

    var getAdjGridCell = function(currCell, grid, dir) {
        var mat = grid.getGrid();
        var x = currCell.getX();
        var y = currCell.getY();
        var maxX = grid.dimX();
        var maxY = grid.dimY();
        var nextCell;
        switch (dir) {
        case NORTH:
            nextCell = mat[x][getNorthY(y, maxY)];
            break;
        case EAST:
            nextCell = mat[getEastX(x, maxX)][y];
            break;
        case SOUTH:
            nextCell = mat[x][getSouthY(y, maxY)];
            break;
        case WEST:
            nextCell = mat[getWestX(x, maxX)][y];
            break;
        }
        return nextCell;
    };

    // print the maze grid with the undefined directions set as the walls.
    var printGrid = function(grid) {
        var i, j;
        var mat = grid.getGrid();

        // First we print out the top line.
        var topStr = " ";
        j = 0;
        for (i = 0; i < grid.dimX(); i += 1) {
            var c = mat[i][j];
            if (c.getCell(NORTH) === undefined) {
                topStr += "_";
            } else {
                topStr += " ";
            }
            if (i < grid.dimX() - 1) {
                topStr += " ";
            }
        }
        outputfn(topStr);

        for (j = 0; j < grid.dimY(); j += 1) {
            var str = "";
            // Next print out the east, south and west lines.
            for (i = 0; i < grid.dimX(); i += 1) {
                var c = mat[i][j];
                if (c.getCell(WEST) === undefined) {
                    // For the end cell, draw sides with '(' or ')'.
                    if (c.getCellType() === END) {
                        str += "(";
                    } else if (mat[getWestX(i, grid.dimX())][j].getCellType()
                               === END) {
                        str += ")";
                    } else {
                        str += "|";
                    }
                } else {
                    str += " ";
                }
                if (c.getCell(SOUTH) === undefined) {
                    str += "_";
                } else {
                    str += " ";
                }
            }

            if (mat[grid.dimX() - 1][j].getCell(EAST) === undefined) {
                str += "|";
            } else {
                str += " ";
            }
            outputfn(str);
        }
        outputfn("");
    };

    // Debugging function to dump the cells
    var dumpGrid = function(grid) {
        var i, j;
        var mat = grid.getGrid();

        outputfn("Dumping grid data");
        for (j = 0; j < grid.dimY(); j += 1) {
            // Next print out the east, south and west lines.
            var c
            for (i = 0; i < grid.dimX(); i += 1) {
                c = mat[i][j];

                outputfn(c.getX() + "," + c.getY() + " north: " + c.getCell(NORTH));
                outputfn(c.getX() + "," + c.getY() + " east: " + c.getCell(EAST));
                outputfn(c.getX() + "," + c.getY() + " south: " + c.getCell(SOUTH));
                outputfn(c.getX() + "," + c.getY() + " west: " + c.getCell(WEST));
            }
        }
    };

    // The cell object represents the operations done on a block in the maze.
    var cell = function(x, y, grid) {
        var north;
        var east;
        var south;
        var west;

        var cellType = UNDEFINED;
        // neighbors are adjacent cells that are defined.
        var numNeighbors = 0;
        return {
            toString: function() {
                return "" + x + "," + y + " " + typeToStr(cellType);
            },
            incrementNeighbor: function() {
                numNeighbors += 1;
            },
            getNumNeighbors: function() {
                return numNeighbors;
            },
            // Checks the cell's neighbors to see if its near the end
            getEndDir: function() {
                var mat = grid.getGrid();
                var maxX = grid.dimX();
                var maxY = grid.dimY();
                if (mat[x][getNorthY(y, maxY)].getCellType() === END) {
                    return NORTH;
                }
                if (mat[getEastX(x, maxX)][y].getCellType() === END) {
                    return EAST;
                }
                if (mat[x][getSouthY(y, maxY)].getCellType() === END) {
                    return SOUTH;
                }
                if (mat[getWestX(x, maxX)][y].getCellType() === END) {
                    return WEST;
                }
                return NOWHERE;
            },

            // Standard getter/setter methods
            getX: function() {
                return x;
            },
            getY: function() {
                return y;
            },
            getCell: function(dir) {
                switch (dir) {
                case NORTH:
                    return north;
                case EAST:
                    return east;
                case SOUTH:
                    return south;
                case WEST:
                    return west;
                }
            },
            setCell: function(dir, newCell) {
                switch (dir) {
                case NORTH:
                    north = newCell;
                    break;
                case EAST:
                    east = newCell;
                    break;
                case SOUTH:
                    south = newCell;
                    break;
                case WEST:
                    west = newCell;
                    break;
                }
            },
            getCellType: function() {
                return cellType;
            },
            getCellTypeStr: function() {
                switch(cellType) {
                case UNDEFINED:
                    return "UNDEFINED";
                case START:
                    return "START";
                case PATH:
                    return "PATH";
                case END:
                    return "END";
                default:
                    return "UNKNOWN CELL TYPE";
                }
            },
            setCellType: function(newType) {
                if (cellType !== UNDEFINED) {
                    return;
                }
                cellType = newType;
            },
        };
    };

    // A path is a set of ordered cells representing a walk through the maze,
    // which may or may not end in the END cell.
    var path = function() {
        var steps = [];
        var hasSolution = false;
        return {
            push: function(c) {
                if (c.getCellType() === END) {
                    hasSolution = true;
                }
                return steps.push(c);
            },
            pop: function() {
                return steps.pop();
            },
            length: function() {
                return steps.length;
            },
            isNearEnd: function() {
                return nearEnd;
            },
            hasSolution: function() {
                return hasSolution;
            },
            toString: function() {
                var str = "len: " + steps.length + " - ";
                for (var i = 0 ; i < steps.length; i += 1) {
                    str += i + ": " + steps[i].toString() + " ";
                }
                return str;
            },
            getSteps: function() {
                // This clones the array
                return steps.slice(0);
            },
            contains: function(c) {
                for (var i = 0; i < steps.length; i += 1) {
                    if (c.getX() == steps[i].getX() &&
                        c.getY() == steps[i].getY()) {
                        return true;
                    }
                }
                return false;
            },
        };
    }

    // Creates a grid where each cell is instatiated and all the cells are
    // connected but undefined.
    var initGrid = function(x, y) {
        var i, j, mat = [];
        for (i = 0; i < x; i += 1) {
            var a = [];
            for (j = 0; j < y; j += 1) {
                a[j] = cell(i, j, this);
            }
            mat[i] = a;
        }

        return {
            getGrid: function() {
                return mat;
            },
            dimX: function() {
                return x;
            },
            dimY: function() {
                return y;
            }
        };
    };

    // Increments the neighbors count of each neighbor of this cell.
    var incrCellNeighbors = function(grid, thisCell) {
        var x = thisCell.getX();
        var y = thisCell.getY();
        var maxX = grid.dimX();
        var maxY = grid.dimY();
        var mat = grid.getGrid();
        mat[x][getNorthY(y, maxY)].incrementNeighbor();
        mat[x][getSouthY(y, maxY)].incrementNeighbor();
        mat[getEastX(x, maxX)][y].incrementNeighbor();
        mat[getWestX(x, maxX)][y].incrementNeighbor();
    };

    // Set the maze cell type and direction. If dir is not specified then we
    // simply set the type and return undefined.
    var setMazeCell = function(grid, thisCell, type, dir, nextCell) {
        incrCellNeighbors(grid, thisCell);

        var mat = grid.getGrid();
        if (type !== undefined) {
            thisCell.setCellType(type);
        }

        if (dir === undefined) {
            return;
        }

        var maxX = grid.dimX();
        var maxY = grid.dimY();
        switch (dir) {
        case NORTH:
            if (g_debugLevel > 5) {
                outputfn("  set north: " + thisCell.getX() + "," + thisCell.getY());
                outputfn("  set south: " + nextCell.getX() + "," + nextCell.getY());
            }
            thisCell.setCell(NORTH, nextCell);
            nextCell.setCell(SOUTH, thisCell);
            nextCell.setCellType(type);
            break;
        case EAST:
            if (g_debugLevel > 5) {
                outputfn("  set east: " + thisCell.getX() + "," + thisCell.getY());
                outputfn("  set west: " + nextCell.getX() + "," + nextCell.getY());
            }
            thisCell.setCell(EAST, nextCell);
            nextCell.setCell(WEST, thisCell);
            nextCell.setCellType(type);
            break;
        case SOUTH:
            if (g_debugLevel > 5) {
                outputfn("  set south: " + thisCell.getX() + "," + thisCell.getY());
                outputfn("  set north: " + nextCell.getX() + "," + nextCell.getY());
            }
            thisCell.setCell(SOUTH, nextCell);
            nextCell.setCell(NORTH, thisCell);
            nextCell.setCellType(type);
            break;
        case WEST:
            if (g_debugLevel > 5) {
                outputfn("  set west: " + thisCell.getX() + "," + thisCell.getY());
                outputfn("  set east: " + nextCell.getX() + "," + nextCell.getY());
            }
            thisCell.setCell(WEST, nextCell);
            nextCell.setCell(EAST, thisCell);
            nextCell.setCellType(type);
            break;
        }
        return;
    };

    var getRandomPath = function() {
        return Math.floor((Math.random()*12) / 3);
    };

    // Check whether a cell within the paritition contains the END cell.
    //
    // XXX: This is pretty inefficient as it must to check the continually
    // growing list of checked cells each time.  We should use some type of cell
    // coloring algorithm to improve efficiency.
    var partitionContainsEnd = function(nextCell, grid) {
        var checkedCells = path();
        var pathsToCheck = path();

        // prime the loop
        if (nextCell.getCellType() === END) {
            return true;
        }
        // REFACTOR
        for (var nextDir = 0; nextDir < 4; nextDir += 1) {
            var c = getAdjGridCell(nextCell, grid, nextDir % 4);
            if (c.getCellType() === UNDEFINED) {
                if (g_debugLevel > 6) {
                    outputfn("  adding " + c.toString() + " to paths to check");
                }
                pathsToCheck.push(c);
            } else if (c.getCellType() === END) {
                if (g_debugLevel > 6) {
                    outputfn("found " + c.toString());
                }
                return true;
            }
            checkedCells.push(c);
        }

        while (pathsToCheck.length() !== 0) {
            var nextPath = pathsToCheck.pop();

            // REFACTOR, repeated code with above.
            for (var nextDir = 0; nextDir < 4; nextDir += 1) {
                var c = getAdjGridCell(nextPath, grid, nextDir % 4);
                if (c.getCellType() === UNDEFINED) {
                    if (!pathsToCheck.contains(c) &&
                        !checkedCells.contains(c)) {
                        if (g_debugLevel > 6) {
                            outputfn("adding " + c.toString() + " to paths to check");
                        }
                        pathsToCheck.push(c);
                    }
                } else if (c.getCellType() === END) {
                    if (g_debugLevel > 6) {
                        outputfn("found " + c.toString());
                    }
                    return true;
                }
                checkedCells.push(c);
            }
        }

        return false;
    }

    // Returns the next valid path (direction, cell) allowed from the current
    // cell.
    var getNextValidPath = function(currCell, grid, pathLen,
                                    minSlnLen, currPath, findEnd) {
        var nextCell;
        var nextPath = getRandomPath();
        var pathValid = false;
        var tries = 0;
        while (!pathValid) {
            nextCell = getAdjGridCell(currCell, grid, nextPath);
            if (g_debugLevel > 5) {
                outputfn("    next path, " + dirToStr(nextPath) +
                      " nextCell to check " + nextCell.toString());
            }
            if (nextCell.getCellType() === UNDEFINED) {
                pathValid = true;
            } else if (nextCell.getCellType() === END &&
                       pathLen >= minSlnLen) {
                pathValid = true;
            }

            // If we've already seen this cell in our currPath, or the path
            // can't lead to the END, it's invalid.
            if (findEnd &&
                pathValid && (currPath.contains(nextCell) ||
                              !partitionContainsEnd(nextCell, grid))) {
                if (g_debugLevel > 3) {
                    outputfn(currPath.toString());
                    outputfn("  " + dirToStr(nextPath) + " cell " +
                          nextCell.getX() + "," + nextCell.getY() +
                          " is invalid");
                }
                pathValid = false;
            }

            if (g_debugLevel > 3) {
                outputfn("  " + dirToStr(nextPath) + " cell " +
                      nextCell.getX() + "," + nextCell.getY() +
                      ": " + pathValid + " - " + nextCell.getCellTypeStr());
            }

            if (pathValid) {
                break;
            }

            if (tries > 3) {
                nextPath = NOWHERE;
                // outputfnGrid(grid);
                // throw "failed to find a path";
                break;
            }
            tries += 1;
            nextPath = (nextPath + 1) % 4; // clock-wise shift
        }

        return pathValid ? [nextPath, nextCell] : [nextPath, null];
    };

    // Create a path through the maze, beginning from the 'start' cell and
    // ending when the cell type is one of the stop conditions.  If an existing
    // trail is provided, that path will be augmented.
    //
    // XXX: The randomness makes _really_ difficult mazes, which is kinda cool.
    // It would be interesting to be able to set a level of difficulty.
    var createPath = function(grid, startCell, stopConditions,
                              minSlnLen, findEnd, existingPath) {
        var mat = grid.getGrid();
        var currCell = startCell;
        var pathLen = 0;
        var stopConditionReached = false;
        var p;

        if (existingPath === null) {
            p = path();
        } else {
            p = existingPath;
        }
        p.push(currCell);
        while (!stopConditionReached) {
            if (g_debugLevel > 3) {
                outputfn("  finding next valid path for: " +
                      currCell.getX()+ "," + currCell.getY());
            }
            var retArray = getNextValidPath(currCell, grid, pathLen,
                                            minSlnLen, p, findEnd);
            dir = retArray[0];
            nextCell = retArray[1];
            if (dir === NOWHERE || nextCell === null) {
                break;
            } else {
                setMazeCell(grid, currCell, PATH, dir, nextCell);
            }
            currCell = nextCell;
            p.push(currCell);
            pathLen += 1;

            for (var c = 0; c < stopConditions.length; c += 1) {
                if (currCell.getCellType() === stopConditions[c]) {
                    stopConditionReached = true;
                    break;
                }
            }
        }
        return p;
    };

    // Create an alternative set of paths divergent from the given solution
    // path.
    var createFakePaths = function(grid, slnPath) {
        // XXX We should get a measure of "sparseness"
        // of the grid to see if we need to iterate
        // over the fake paths to add more trails.
        var paths = [];

        var steps = slnPath.getSteps();
        for (var s = 0; s < steps.length; s++) {
            var c = steps[s];
            if (c.getCellType() === END) {
                break;
            }
            if (c.getNeighbors > 3) {
                continue;
            }

            var nextDir = NORTH;
            for (; nextDir < 5; nextDir += 1) {
                var nextCell = getAdjGridCell(c, grid, nextDir % 4);
                if (c.getCell(nextDir % 4) === undefined &&
                    nextCell.getCellType() === UNDEFINED) {
                    setMazeCell(grid, c, PATH, nextDir % 4, nextCell);
                    var p = createPath(grid, nextCell, [END], 5, false, null);
                    paths.push(p);
                }
            }
        }
        return paths;
    };

    // run(): run is the main function for the MazeCreator program.  It
    // initializes the grid then creates paths.  We first create paths until the
    // start cell or end cell have no free adjacent cells.  At that point we
    // force a solution.  We then run a couple of "fake" paths to make the maze
    // more interesting.
    return {
    run: function() {
        var grid;
        var slnPath;
        var mat;
        var startCell, endCell;
        var fakePaths;

        grid = initGrid(g_gridDim[0], g_gridDim[1]);
        mat = grid.getGrid();

        startCell = mat[g_mazeStart[0]][g_mazeStart[1]];
        endCell = mat[g_mazeEnd[0]][g_mazeEnd[1]];
        setMazeCell(grid, startCell, START);
        setMazeCell(grid, endCell, END);

        outputfn("maze start: " + g_mazeStart[0] + "," + g_mazeStart[1] +
              " end: " + g_mazeEnd[0] + "," + g_mazeEnd[1]);

        slnPath = createPath(grid, startCell, [END],
                             g_minSlnLen, true, null);

        outputfn("maze solution: find the cell marked by '( )'");

        // XXX Instead of "printing" these paths to the console, we can return
        // them to be processed in the render request.

        printGrid(grid);
        fakePaths = createFakePaths(grid, slnPath);

        outputfn("maze with first order diversions:");
        printGrid(grid);

        if (g_debugLevel > 7) {
            dumpGrid(grid);
        }
    }
    };
};

var app = MazeCreator(25, 25);
app.run();
