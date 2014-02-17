// - - - - - - - - - - - - - - - - - - - - - - - - - - -
// mazeCreator.js - example maze creator in javascript.
// Author: Dan Phung
//
// Tested using 'node version v0.10.25' in OSX Terminal.
// To enable console output, set ENABLE_CONSOLE_OUTPUT = true;
//
// Added web page front end.
//
// - - - - - - - - - - - - - - - - - - - - - - - - - - -

var ENABLE_CONSOLE_OUTPUT = false;

// Maze creator prototype that encapsulates a grid with cells, each made up of a
// set of north, east, south, or/and west walls.  The main function is run().
var MazeCreator = function(dimX, dimY) {
    // Maze globals
    var g_debugLevel = 1;
    var g_gridDim = [dimX, dimY];
    var g_mazeStart = [0, 0];
    var g_mazeEnd = [Math.floor(dimX / 2), Math.floor(dimY / 2)];
    var g_minBranches = Math.floor(Math.sqrt(g_gridDim[0] * g_gridDim[1]));
    var g_minSlnLen = Math.floor(Math.sqrt(g_gridDim[0] * g_gridDim[1]));
    var g_currentCell;
    var g_solved;

    var UNDEFINED = 0;
    var START     = 1;
    var END       = 2;
    var PATH      = 3;

    var NORTH   = 0;
    var EAST    = 1;
    var SOUTH   = 2;
    var WEST    = 3;
    var NOWHERE = 4;

    // For node, use console.log. v8, print
    var outputfn = console.log

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
        console.log(topStr);

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
            console.log(str);
        }
        console.log("");
    };

    // Debugging function to dump the cells
    var dumpGrid = function(grid) {
        var i, j;
        var mat = grid.getGrid();

        console.log("Dumping grid data");
        for (j = 0; j < grid.dimY(); j += 1) {
            // Next print out the east, south and west lines.
            var c
            for (i = 0; i < grid.dimX(); i += 1) {
                c = mat[i][j];

                console.log(c.getX() + "," + c.getY() + " north: " + c.getCell(NORTH));
                console.log(c.getX() + "," + c.getY() + " east: " + c.getCell(EAST));
                console.log(c.getX() + "," + c.getY() + " south: " + c.getCell(SOUTH));
                console.log(c.getX() + "," + c.getY() + " west: " + c.getCell(WEST));
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
        var isCurrent = false;
        return {
            setCurrent: function(status) {
                isCurrent = status;
            },
            toString: function() {
                return "" + x + "," + y + " " + typeToStr(cellType);
            },
            // Input is the canvas 2d context
            draw: function(canvasContext, width) {
                canvasContext.beginPath();
                canvasContext.lineWidth = 2;
                canvasContext.moveTo(x * width, y * width);
                if (north === undefined) {
                    canvasContext.lineTo((x + 1) * width, y * width);
                } else {
                    canvasContext.moveTo((x + 1) * width, y * width);
                }
                if (east === undefined) {
                    canvasContext.lineTo((x + 1) * width, (y + 1) * width);
                } else {
                    canvasContext.moveTo((x + 1) * width, (y + 1) * width);
                }
                if (south === undefined) {
                    canvasContext.lineTo(x * width, (y + 1) * width);
                } else {
                    canvasContext.moveTo(x * width, (y + 1) * width);
                }
                if (west === undefined) {
                    canvasContext.lineTo(x * width, y * width);
                } else {
                    canvasContext.moveTo(x * width, y * width);
                }
                canvasContext.stroke();

                if (isCurrent) {
                    var centerX = (x + 1/2) * width;
                    var centerY = (y + 1/2) * width;
                    var radius = width * 4 / 10;

                    canvasContext.beginPath();
                    canvasContext.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
                    canvasContext.fillStyle = 'green';
                    canvasContext.fill();
                    canvasContext.stroke();
                }

                if (cellType === END) {
                    var centerX = (x + 1/2) * width;
                    var centerY = (y + 1/2) * width;
                    var radius = width * 4 / 10;

                    canvasContext.beginPath();
                    canvasContext.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
                    canvasContext.fillStyle = 'red';
                    canvasContext.fill();
                    // canvasContext.lineWidth = 2;
                    // canvasContext.strokeStyle = 'black';
                    canvasContext.stroke();
                }
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
            getElement: function(index) {
                if (index < 0 || index >= steps.length) {
                    return undefined;
                }

                return steps[index];
            },
            contains: function(c) {
                return steps.indexOf(c) !== -1;
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
                console.log("  set north: " + thisCell.getX() + "," + thisCell.getY());
                console.log("  set south: " + nextCell.getX() + "," + nextCell.getY());
            }
            thisCell.setCell(NORTH, nextCell);
            nextCell.setCell(SOUTH, thisCell);
            nextCell.setCellType(type);
            break;
        case EAST:
            if (g_debugLevel > 5) {
                console.log("  set east: " + thisCell.getX() + "," + thisCell.getY());
                console.log("  set west: " + nextCell.getX() + "," + nextCell.getY());
            }
            thisCell.setCell(EAST, nextCell);
            nextCell.setCell(WEST, thisCell);
            nextCell.setCellType(type);
            break;
        case SOUTH:
            if (g_debugLevel > 5) {
                console.log("  set south: " + thisCell.getX() + "," + thisCell.getY());
                console.log("  set north: " + nextCell.getX() + "," + nextCell.getY());
            }
            thisCell.setCell(SOUTH, nextCell);
            nextCell.setCell(NORTH, thisCell);
            nextCell.setCellType(type);
            break;
        case WEST:
            if (g_debugLevel > 5) {
                console.log("  set west: " + thisCell.getX() + "," + thisCell.getY());
                console.log("  set east: " + nextCell.getX() + "," + nextCell.getY());
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
                    console.log("  adding " + c.toString() + " to paths to check");
                }
                pathsToCheck.push(c);
            } else if (c.getCellType() === END) {
                if (g_debugLevel > 6) {
                    console.log("found " + c.toString());
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
                            console.log("adding " + c.toString() + " to paths to check");
                        }
                        pathsToCheck.push(c);
                    }
                } else if (c.getCellType() === END) {
                    if (g_debugLevel > 6) {
                        console.log("found " + c.toString());
                    }
                    return true;
                }
                checkedCells.push(c);
            }
        }

        return false;
    }

    // Check if the front or two sides creates a wall defining a new partition.
    var checkPathDirection = function(currCell, prevCell, grid, dir) {
        if (currCell.getCell(dir) === prevCell) {
            var oppositeDir = (dir + 2) % 4;
            var side1Dir = (oppositeDir + 3) % 4;
            var side2Dir = (oppositeDir + 1) % 4;

            var frontCell = getAdjGridCell(currCell, grid, oppositeDir);
            var sideCell1 = getAdjGridCell(frontCell, grid, side1Dir);
            var sideCell2 = getAdjGridCell(frontCell, grid, side2Dir);

            if (frontCell.getCellType() !== UNDEFINED ||
                sideCell1.getCellType() !== UNDEFINED ||
                sideCell2.getCellType() !== UNDEFINED) {
                return true;
            } else {
                return false;
            }
        }
    }

    // Returns true if the cell could create a new partition, which can only
    // happen if the current cell's direction heads into a defined set of cells.
    // E.g. In this path, cell 2, which was preceeded by cell 1 will create a
    // partition since the direction it's heading will close off a portion of
    // the maze.  The directionality of the check means that we don't have to
    // check the entire perimeter of cell 2.  E.g. Cell 3 doesn't create a new
    // partition.  This gives us a 2x performance increase in maze creation
    // time.
    //  _ _ _ _ _ _ _
    // |_   _ _  |_|_|
    // |_| |_|_| |_|_|
    // |3|_|_|_| |_|_|
    // |2|_|_|_| |_|_|
    // |1|_|_|_| |_|_|
    // |_ _ _ _ _|_|_|
    // |_|_|_|_|_|_|_|

    var cellCreatesPartition = function(currCell, currPath, grid) {
        // The least amount of steps needed to create an enclosed parition is
        // 8 steps:
        //  _ _ _ _ _ _ _
        // |_ _  |_|_|_|_|
        // | |_| |_|_|_|_|
        // |_ _ _|_|_|_|_|
        // |_|_|_|_|_|_|_|
        // |_|_|_|_|_|_|_|
        // |_|_|_|_|_|_|_|
        // |_|_|_|_|_|_|_|

        if (currPath.length() < 8) {
            return false;
        }

        prevCell = currPath.getElement(currPath.length - 2);

        if (checkPathDirection(currCell, prevCell, grid, NORTH) ||
            checkPathDirection(currCell, prevCell, grid, EAST)  ||
            checkPathDirection(currCell, prevCell, grid, SOUTH) ||
            checkPathDirection(currCell, prevCell, grid, WEST)) {
            return true;
        }
        return false;
    };

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
                console.log("    next path, " + dirToStr(nextPath) +
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
            if (findEnd && pathValid &&
                (currPath.contains(nextCell) ||
                 (cellCreatesPartition(currCell, currPath, grid) &&
                  !partitionContainsEnd(nextCell, grid)))) {
                if (g_debugLevel > 3) {
                    console.log(currPath.toString());
                    console.log("  " + dirToStr(nextPath) + " cell " +
                          nextCell.getX() + "," + nextCell.getY() +
                          " is invalid");
                }
                pathValid = false;
            }

            if (g_debugLevel > 3) {
                console.log("  " + dirToStr(nextPath) + " cell " +
                      nextCell.getX() + "," + nextCell.getY() +
                      ": " + pathValid + " - " + nextCell.getCellTypeStr());
            }

            if (pathValid) {
                break;
            }

            if (tries > 3) {
                nextPath = NOWHERE;
                if (findEnd) {
                    printGrid(grid);
                    throw "failed to find a path";
                }
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
                console.log("  finding next valid path for: " +
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

    var setCurrentCell = function(c) {
        if (g_currentCell) {
            g_currentCell.setCurrent(false);
        }
        g_currentCell = c;
        g_currentCell.setCurrent(true);
        if (g_currentCell.getCellType() === END) {
            g_solved = true;
        } else {
            g_solved = false;
        }
    };


    // run(): run is the main function for the MazeCreator program.  It
    // initializes the grid then creates paths.  We first create paths until the
    // start cell or end cell have no free adjacent cells.  At that point we
    // force a solution.  We then run a couple of "fake" paths to make the maze
    // more interesting.
    return {
        m_grid: undefined,
        m_ghostMode: undefined,
        m_hintMode: undefined,
        create: function(printOutput) {
            var slnPath;
            var mat;
            var startCell, endCell;
            var fakePaths;

            m_grid = initGrid(g_gridDim[0], g_gridDim[1]);
            mat = m_grid.getGrid();

            startCell = mat[g_mazeStart[0]][g_mazeStart[1]];
            endCell = mat[g_mazeEnd[0]][g_mazeEnd[1]];
            setMazeCell(m_grid, startCell, START);
            setMazeCell(m_grid, endCell, END);

            if (printOutput) {
                console.log("maze start: " + g_mazeStart[0] + "," + g_mazeStart[1] +
                         " (top hleft)");
                console.log("       end: " + g_mazeEnd[0] + "," + g_mazeEnd[1] +
                         " cell marked by '( )'");
            }

            slnPath = createPath(m_grid, startCell, [END],
                                 g_minSlnLen, true, null);

            if (printOutput) {
                console.log("maze solution:");
                printGrid(m_grid);
            }
            fakePaths = createFakePaths(m_grid, slnPath);
            m_ghostMode = false;
            m_hintMode = false;

            setCurrentCell(startCell);

            if (printOutput) {
                console.log("maze with first order diversions:");
                printGrid(m_grid);
            }

            if (g_debugLevel > 7) {
                dumpGrid(m_grid);
            }
            return startCell;
        },

        // Input is the canvas 2d context
        drawMazeGrid: function(ctx, cellWidth) {
            var i, j;
            var mat = m_grid.getGrid();
            for (j = 0; j < m_grid.dimY(); j += 1) {
                for (i = 0; i < m_grid.dimY(); i += 1) {
                    mat[i][j].draw(ctx, cellWidth);
                }
            }
        },

        // This maze state modifiers must return 'this' in order for state to be
        // preserved across calls.
        resetStart: function() {
            var mat = m_grid.getGrid();
            startCell = mat[g_mazeStart[0]][g_mazeStart[1]];
            setCurrentCell(startCell);
        },

        moveNorth: function() {
            var c;
            if (m_ghostMode) {
                    c = getAdjGridCell(g_currentCell, m_grid, NORTH);
            } else {
                c = g_currentCell.getCell(NORTH);
            }

            if (c) {
                setCurrentCell(c);
            }
        },

        moveEast: function() {
            var c;
            if (m_ghostMode) {
                    c = getAdjGridCell(g_currentCell, m_grid, EAST);
            } else {
                c = g_currentCell.getCell(EAST);
            }

            if (c) {
                setCurrentCell(c);
            }
        },

        moveSouth: function() {
            var c;
            if (m_ghostMode) {
                    c = getAdjGridCell(g_currentCell, m_grid, SOUTH);
            } else {
                c = g_currentCell.getCell(SOUTH);
            }

            if (c) {
                setCurrentCell(c);
            }
        },

        moveWest: function() {
            var c;
            if (m_ghostMode) {
                    c = getAdjGridCell(g_currentCell, m_grid, WEST);
            } else {
                c = g_currentCell.getCell(WEST);
            }

            if (c) {
                setCurrentCell(c);
            }
        },

        toggleGhostMode: function()  {
            m_ghostMode = !m_ghostMode;
        },

        toggleHintMode: function()  {
            m_hintMode = !m_hintMode;
        },

        solved: function()  {
            return g_solved;
        },
    };
};

if (ENABLE_CONSOLE_OUTPUT) {
    var app = MazeCreator(25, 25);
    app.create(false, true);
}
