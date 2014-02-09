// - - - - - - - - - - - - - - - - - - - - - - -
// maze.js - example maze creator in javascript.
// Author: Dan Phung
//
// Tested using 'V8 version 3.23.15'
// - - - - - - - - - - - - - - - - - - - - - - -

var MazeApp = function() {
    var g_debugLevel = 3;
    var g_gridDim = [10, 10];
    var g_minSlnLen = 7;
    var g_mazeStart = [0, 0];
    var g_mazeEnd = [g_gridDim[0] - 1, g_gridDim[1] - 1];

    var UNDEFINED = 0;
    var START     = 1;
    var PATH      = 2;
    var END       = 3;
    var ATL       = 4;

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

    var printGrid = function(grid) {
        var i, j;
        var mat = grid.getGrid();

        // First we print out the top line.
        var topStr = " ";
        j = 0;
        for (i = 0; i < grid.dimX(); i++) {
            var c = mat[i][j];
            if (c.getNorthCell() === undefined) {
                topStr += "_";
            } else {
                topStr += " ";
            }
            if (i < grid.dimX() - 1) {
                topStr += " ";
            }
        }
        print(topStr);

        for (j = 0; j < grid.dimY(); j++) {
            var str = "";

            str = "";
            // Next print out the east, south and west lines.
            for (i = 0; i < grid.dimX(); i++) {
                var c = mat[i][j];
                if (c.getWestCell() === undefined) {
                    str += "|";
                } else {
                    str += " ";
                }
                if (c.getSouthCell() === undefined) {
                    str += "_";
                } else {
                    str += " ";
                }
            }

            if (mat[grid.dimX() - 1][j].getEastCell() === undefined) {
                str += "|";
            } else {
                str += " ";
            }
            print(str);
        }
    };

    var dumpGrid = function(grid) {
        var i, j;
        var mat = grid.getGrid();

        print("Dumping grid data");
        for (j = 0; j < grid.dimY(); j++) {
            // Next print out the east, south and west lines.
            var c
            for (i = 0; i < grid.dimX(); i++) {
                c = mat[i][j];
                print(c.getX() + "," + c.getY() + " north: " + c.getNorthCell());
                print(c.getX() + "," + c.getY() + " east: " + c.getEastCell());
                print(c.getX() + "," + c.getY() + " south: " + c.getSouthCell());
                print(c.getX() + "," + c.getY() + " west: " + c.getWestCell());
            }
        }
    };


    // XXX Is there a more generic way of doing the NESW functions without repeating
    // code for each orientation?
    var cell = function(x, y) {
        var north;
        var east;
        var south;
        var west;

        var cellType = UNDEFINED;
        // neighbors are adjacent cells that are defined.
        var numNeighbors = 0;
        return {
            incrementNeighbor: function() {
                numNeighbors += 1;
            },

            // Standard getter/setter methods
            getX: function() {
                return x;
            },
            getY: function() {
                return y;
            },
            getNorthCell: function() {
                return north;
            },
            setNorthCell: function(newCell) {
                north = newCell;
            },
            getEastCell: function() {
                return east;
            },
            setEastCell: function(newCell) {
                east = newCell;
            },
            getSouthCell: function() {
                return south;
            },
            setSouthCell: function(newCell) {
                south = newCell;
            },
            getWestCell: function() {
                return west;
            },
            setWestCell: function(newCell) {
                west = newCell;
            },
            getCellType: function() {
                return cellType;
            },
            setCellType: function(newType) {
                if (cellType !== UNDEFINED) {
                    return;
                }
                cellType = newType;
            },
        };
    };

    // Creates a grid where each cell is instatiated and all the cells are
    // connected but undefined.
    var initGrid = function(x, y) {
        var i, j, mat = [];
        for (i = 0; i < x; i++) {
            var a = [];
            for (j = 0; j < y; j++) {
                a[j] = cell(i, j);
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

    var incrCellNeighbors = function(grid, x, y) {
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

    var setMazeCell = function(grid, x, y, type, dir, nextCell) {
        incrCellNeighbors(grid, x, y);

        var mat = grid.getGrid();
        if (type !== undefined) {
            mat[x][y].setCellType(type);
        }

        if (dir === undefined) {
            return;
        }

        var maxX = grid.dimX();
        var maxY = grid.dimY();
        var thisCell = mat[x][y];
        switch (dir) {
        case NORTH:
            if (g_debugLevel > 5) {
                print("  set north: " + thisCell.getX() + "," + thisCell.getY());
                print("  set south: " + nextCell.getX() + "," + nextCell.getY());
            }
            thisCell.setNorthCell(nextCell);
            nextCell.setSouthCell(thisCell);
            break;
        case EAST:
            if (g_debugLevel > 5) {
                print("  set east: " + thisCell.getX() + "," + thisCell.getY());
                print("  set west: " + nextCell.getX() + "," + nextCell.getY());
            }
            thisCell.setEastCell(nextCell);
            nextCell.setWestCell(thisCell);
            break;
        case SOUTH:
            if (g_debugLevel > 5) {
                print("  set south: " + thisCell.getX() + "," + thisCell.getY());
                print("  set north: " + nextCell.getX() + "," + nextCell.getY());
            }
            thisCell.setSouthCell(nextCell);
            nextCell.setNorthCell(thisCell);
            break;
        case WEST:
            if (g_debugLevel > 5) {
                print("  set west: " + thisCell.getX() + "," + thisCell.getY());
                print("  set east: " + nextCell.getX() + "," + nextCell.getY());
            }
            thisCell.setWestCell(nextCell);
            nextCell.setEastCell(thisCell);
            break;
        }
        return;
    };

    var getRandomPath = function() {
        return Math.floor((Math.random()*12) / 3);
    };

    var getNextValidPath = function(currCell, grid, pathLen, minSlnLen) {
        var nextCell;
        var mat = grid.getGrid();
        var x = currCell.getX();
        var y = currCell.getY();
        var maxX = grid.dimX();
        var maxY = grid.dimY();

        // we could try other things like random paths each time or
        // ccw to see how the shape of the maze changes.
        var nextPath = getRandomPath();
        var pathValid = false;
        var tries = 0;
        while (!pathValid) {
            switch (nextPath) {
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

            if (nextCell.getCellType() === UNDEFINED) {
                pathValid = true;
            } else if (nextCell.getCellType() === END &&
                       pathLen >= minSlnLen) {
                pathValid = true;
            }

            if (g_debugLevel > 5) {
                print("  " + dirToStr(nextPath) + " cell " +
                      nextCell.getX() + "," + nextCell.getY() +
                      ": " + pathValid + " - " + nextCell.getCellType());
            }

            if (pathValid) {
                break;
            }

            tries += 1;
            if (tries > 3) {
                nextPath = NOWHERE;
                break;
            }
            nextPath = (nextPath + 1) % 4; // cw shift
        }

        return pathValid ? [nextPath, nextCell] : [nextPath, null];
    };

    var createPath = function(grid, start, minSlnLen) {
        var mat = grid.getGrid();
        var currCell = mat[start[0]][start[1]];
        var pathLen = 0;
        while (currCell.getCellType() !== END) {
            if (g_debugLevel > 5) {
                print("Finding next valid path for: " +
                      currCell.getX()+ "," + currCell.getY());
            }
            var retArray = getNextValidPath(currCell, grid, pathLen, minSlnLen);
            dir = retArray[0];
            nextCell = retArray[1];
            if (dir === NOWHERE || nextCell === null) {
                // XXX Need to implement lookahead feature
                return NOWHERE;
            } else {
                setMazeCell(grid, currCell.getX(), currCell.getY(),
                            PATH, dir, nextCell);
            }
            currCell = nextCell;
            pathLen += 1;
        }
    };

    return {
    run: function() {
        // XXX randomize the start and end
        var grid;
        var fakePaths = 0;
        var solutionFound = false;

        grid = initGrid(g_gridDim[0], g_gridDim[1]);
        setMazeCell(grid, g_mazeStart[0], g_mazeStart[1], START);
        setMazeCell(grid, g_mazeEnd[0], g_mazeEnd[1], END);
        while (!solutionFound) {
            solutionFound = createPath(grid, g_mazeStart, g_minSlnLen) !== NOWHERE;
            if (!solutionFound) {
                fakePaths += 1;
                print("solution not found: " + fakePaths);
                if (fakePaths > 500)  {
                    break;
                }
            }
        }

        print("fake paths: " + fakePaths);
        printGrid(grid);

        if (g_debugLevel > 5) {
            dumpGrid(grid);
        }
    }
    };
};

var app = MazeApp();
app.run();
