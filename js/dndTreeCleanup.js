treeJSON = d3.json("f2-min3.json", function(error, treeData) {
    setTimeout(function(){ 
        visu(error, treeData); 
    }, 200);
});

var mdData = "Initializing";
var jData = {};
var dMode ="Navigate";

function visu (error, treeData) {
    // Calculate total nodes, max label length
    var totalNodes = 0;
    var maxLabelLength = 0;
    // variables for drag/drop
    var selectedNode = null;
    var draggingNode = null;
    // panning variables
    var panSpeed = 200;
    var panBoundary = 20; // Within 20px from edges will pan when dragging.
    // Misc. variables
    var i = 0;
    var duration = 750;
    var root;

    // size of the diagram
    var errDoc = $(document);
   
    var viewerWidth = $(document).width()*.8;
    var viewerHeight = $(document).height()*.9;


    var tree = d3.layout.tree()
        .size([viewerHeight, viewerWidth]);

    // define a d3 diagonal projection for use by the node paths later on.
    var diagonal = d3.svg.diagonal()
        .projection(function(d) {
            return [d.y, d.x];
        });


    // A recursive helper function for performing some setup by walking through all nodes        
    function visit(parent, visitFn, childrenFn) {
        if (!parent) return;

        visitFn(parent);

        var children = childrenFn(parent);
        if (children) {
            var count = children.length;
            for (var i = 0; i < count; i++) {
                visit(children[i], visitFn, childrenFn);
            }
        }
    }

    // Call visit function to establish maxLabelLength
    visit(treeData, function(d) {
        totalNodes++;
        ( typeof (d.name) !== "undefined" ) ? maxLabelLength = Math.max(d.name.length, maxLabelLength): console.log("visit tree err ");

    }, function(d) {
        return d.children && d.children.length > 0 ? d.children : null;
    });


    // sort the tree according to the node names

    function sortTree() {
        tree.sort(function(a, b) {
            return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
        });
    }
    // Sort the tree initially incase the JSON isn't in a sorted order.
    sortTree();

    // TODO: Pan function, can be better implemented.

    function pan(domNode, direction) {
        var speed = panSpeed;
        if (panTimer) {
            clearTimeout(panTimer);
            translateCoords = d3.transform(svgGroup.attr("transform"));
            if (direction == 'left' || direction == 'right') {
                translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
                translateY = translateCoords.translate[1];
            } else if (direction == 'up' || direction == 'down') {
                translateX = translateCoords.translate[0];
                translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
            }
            scaleX = translateCoords.scale[0];
            scaleY = translateCoords.scale[1];
            scale = zoomListener.scale();
            svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
            d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
            zoomListener.scale(zoomListener.scale());
            zoomListener.translate([translateX, translateY]);
            panTimer = setTimeout(function() {
                pan(domNode, speed, direction);
            }, 50);
        }
    }

    // Define the zoom function for the zoomable tree

    function zoom() {
        svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }


    // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
    var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

    function initiateDrag(d, domNode) {
        draggingNode = d;
        d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
        d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');
        d3.select(domNode).attr('class', 'node activeDrag');

        svgGroup.selectAll("g.node").sort(function (a, b) { // select the parent and sort the path's
            if (a.id != draggingNode.id) return 1; // a is not the hovered element, send "a" to the back
            else return -1; // a is the hovered element, bring "a" to the front
        });
        // if nodes has children, remove the links and nodes
        if (nodes.length > 1) {
            // remove link paths
            links = tree.links(nodes);
            nodePaths = svgGroup.selectAll("path.link")
                .data(links, function (d) {
                    return d.target.id;
                }).remove();
            // remove child nodes
            nodesExit = svgGroup.selectAll("g.node")
                .data(nodes, function (d) {
                    return d.id;
                }).filter(function (d, i) {
                    if (d.id == draggingNode.id) {
                        return false;
                    }
                    return true;
                }).remove();
        }

        // remove parent link
       // if (typeof(draggingNode) !== "undefined" && typeof(draggingNode.parent) !== "undefined") {
            parentLink = tree.links(tree.nodes(draggingNode.parent));
            svgGroup.selectAll('path.link').filter(function(d, i) {
                if (d.target.id == draggingNode.id) {
                    return true;
                }
                return false;
            }).remove();
        //}
        dragStarted = null;
    }

    // define the baseSvg, attaching a class for styling and the zoomListener
    var baseSvg = d3.select("#tree-container").append("svg")
        .attr("width", viewerWidth)
        .attr("height", viewerHeight)
        .attr("class", "overlay")
        .call(zoomListener);


    // Define the drag listeners for drag/drop behaviour of nodes.
    dragListener = d3.behavior.drag()
        .on("dragstart", function(d) {
            if (d == root) {
                return;
            }
            dragStarted = true;
            nodes = tree.nodes(d);
            d3.event.sourceEvent.stopPropagation();
            // it's important that we suppress the mouseover event on the node being dragged. Otherwise it will absorb the mouseover event and the underlying node will not detect it d3.select(this).attr('pointer-events', 'none');
        })
        .on("drag", function(d) {
            if (d == root) {
                return;
            }
            if (dragStarted) {
                domNode = this;
               // (typeof(domNode) !== "undefined") && (typeof(d) !== "undefined") ?
                initiateDrag(d, domNode); //: console.log("undefined node");
            }

            // get coords of mouseEvent relative to svg container to allow for panning
            relCoords = d3.mouse($('svg').get(0));
            if (relCoords[0] < panBoundary) {
                panTimer = true;
                pan(this, 'left');
            } else if (relCoords[0] > ($('svg').width() - panBoundary)) {

                panTimer = true;
                pan(this, 'right');
            } else if (relCoords[1] < panBoundary) {
                panTimer = true;
                pan(this, 'up');
            } else if (relCoords[1] > ($('svg').height() - panBoundary)) {
                panTimer = true;
                pan(this, 'down');
            } else {
                try {
                    clearTimeout(panTimer);
                } catch (e) {

                }
            }

            d.x0 += d3.event.dy;
            d.y0 += d3.event.dx;
            var node = d3.select(this);
            node.attr("transform", "translate(" + d.y0 + "," + d.x0 + ")");
            updateTempConnector();
        }).on("dragend", function(d) {
            if (d == root) {
                return;
            }
            domNode = this;
            if (selectedNode) {
                // now remove the element from the parent, and insert it into the new elements children
                var index = draggingNode.parent.children.indexOf(draggingNode);
                if (index > -1) {
                    draggingNode.parent.children.splice(index, 1);
                }
                if (typeof selectedNode.children !== 'undefined' || typeof selectedNode._children !== 'undefined') {
                    if (typeof selectedNode.children !== 'undefined') {
                        selectedNode.children.push(draggingNode);
                    } else {
                        selectedNode._children.push(draggingNode);
                    }
                } else {
                    selectedNode.children = [];
                    selectedNode.children.push(draggingNode);
                }
                // Make sure that the node being added to is expanded so user can see added node is correctly moved
                expand(selectedNode);
                sortTree();
                endDrag();
            } else {
                endDrag();
            }
        });

    function endDrag() {
        selectedNode = null;
        d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
        d3.select(domNode).attr('class', 'node');
        // now restore the mouseover event or we won't be able to drag a 2nd time
        d3.select(domNode).select('.ghostCircle').attr('pointer-events', '');
        updateTempConnector();
        if (draggingNode !== null) {
            update(root);
            //centerNode(draggingNode);
            draggingNode = null;
        }
    }

    // Helper functions for collapsing and expanding nodes.

    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    function expand(d) {
        if (d._children) {
            d.children = d._children;
            d.children.forEach(expand);
            d._children = null;
        }
    }

    var overCircle = function(d) {

        console.log(d.text + "d " + d.name);
        selectedNode = d3.select(d);

        selectedNode.enter().append("foreignObject")
            .append('div')
            .attr('class', 'pop-up')
            .attr({
                    'x': selectedNode.x0,
                    'y': selectedNode.y0,
                    'width': '300px',
                    'height': '300px',
                    'class': 'pop-up'
                })
            .style('left', (selectedNode.x0) + 'px')
            .style('top', (selectedNode.y0) + 'px')
            .style('display', 'block')
            .html("is this shwowing");  

      //  $("#showData").html('This is ' + d.name + " " + d.value + selectedNode.y0 + ":" + selectedNode.x0);
     
    };
    var outCircle = function(d) {
        //selectedNode = null;
       //  $("#showData").html(' Empty ');
        updateTempConnector();
    };

    // Function to update the temporary connector indicating dragging affiliation
    var updateTempConnector = function() {
        var data = [];
        if (draggingNode !== null && selectedNode !== null) {
            // have to flip the source coordinates since we did this for the existing connectors on the original tree
            data = [{
                source: {
                    x: selectedNode.y0,
                    y: selectedNode.x0
                },
                target: {
                    x: draggingNode.y0,
                    y: draggingNode.x0
                }
            }];
        }
        var link = svgGroup.selectAll(".templink").data(data);

        link.enter().append("path")
            .attr("class", "templink")
            .attr("d", d3.svg.diagonal())
            .attr('pointer-events', 'none');

        link.attr("d", d3.svg.diagonal());

        link.exit().remove();
    };

    // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.
    // turned off

    function centerNode(source) {
        scale = zoomListener.scale();
        x = -source.y0;
        y = -source.x0;
        x = x * scale + viewerWidth / 2;
        y = y * scale + viewerHeight / 2;
        d3.select('g').transition()
            .duration(duration)
            .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
        zoomListener.scale(scale);
        zoomListener.translate([x, y]);
    }

    // Toggle children function

    function toggleChildren(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        return d;
    }

    // Toggle children on click.

    function click(d) {
        //alert("hey");
        if ( dMode == "Navigate" ) {
            if (d3.event.defaultPrevented) return; // click suppressed
            d = toggleChildren(d);
            update(d);
            //centerNode(d);
        } else {
            alert("position: x - "  +d.x + " Y = " + d.y)

        }
    }

    function json_xporter() {

        var rootObj = $.extend(true, [], d3.selectAll('g.node'));
        var rootNode = new Object();
        // var rootObj = d3.selectAll('g.node');
        rootObj.each( function(d) {
            var node_data = d;
             if (node_data.depth == 0) {
                rootNode = node_data;
                var children = rootNode.children;
                if (children != null) {
                    $.each(children, function(index, child) {
                        remove_d3_metadata(child);
                    });
                }
            }
        });

        return rootNode;

    } 

    var remove_d3_metadata = function(node_data) {
        // remove the d3 metadata
        delete node_data.parent;
        delete node_data.x;
        delete node_data.x0;
        delete node_data.y;
        delete node_data.y0;
        delete node_data.__proto__;

        var grandchildren = node_data.children;
        if (grandchildren != null) {
            $.each( grandchildren, function(index, grandchild) {
                remove_d3_metadata(grandchild);
            });
        }
    };

    function update(source) {
        // Compute the new height, function counts total children of root node and sets tree height accordingly.
        // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
        // This makes the layout more consistent.
        var levelWidth = [1];
        var childCount = function(level, n) {

            if (n.children && n.children.length > 0) {
                if (levelWidth.length <= level + 1) levelWidth.push(0);

                levelWidth[level + 1] += n.children.length;
                n.children.forEach(function(d) {
                    childCount(level + 1, d);
                });
            }
        };

        childCount(0, root);
        var newHeight = d3.max(levelWidth) * 70; // 25 pixels per line
        tree = tree.size([newHeight, viewerWidth]);

        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);

        // Set widths between levels based on maxLabelLength.
        nodes.forEach(function(d) {
            var scale = 4;
            var scaleFactor = 6;
            var parY = 10, msgLen = 10;
            if (typeof(d.parent) !=="undefined") { parY = d.parent.y + 5; }
            if (typeof(d.parent) !=="undefined" && typeof(d.parent.datatype) !=="undefined") {
                parY = d.parent.y + 5;
                ( typeof(d.name) !== "undefined") ? msgLen = d.name.length: console.log("no name");
                if (d.parent.datatype =="array" || d.parent.datatype =="object" ) {scaleFactor = 3}
                if (d.parent.datatype =="textarea"  ) {scaleFactor = 4}
                if (d.parent.datatype =="date" || d.parent.datatype =="dictlist" ) {scaleFactor = 3}
               
            }

            if  (d.depth == 1 ) { d.y = (1 + d.depth) * maxLabelLength*scale } 
            if  (d.depth > 1 ) {
                d.y = (1 + d.depth) * maxLabelLength*6; } 
            if  (d.depth == 0 ) { d.y = 25; } 

        });

        // Update the nodes…
        node = svgGroup.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++i);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .call(dragListener)
            .attr("class", "node")
            .attr("transform", function(d) {
                console.log('translate ' + source.name + ' ' + source.y0 + "," + source.x0);
                return "translate(" + source.y0  + "," + source.x0 + ")";
            })
            .on('click', click)
            .on('contextmenu',  d3.contextMenu(menu, update(d)) );
       
        console.log("building the tree node " + source.name);
        
        nodeEnter.append("circle")
            .attr('class', 'nodeCircle')
            .attr("r", 0)
            .style("fill", function(d) {
                return d.children || d._children ? "#fff" : "lightsteelblue";
            }); 
        

         nodeEnter.append("rect")
           .attr("y", -12) //nodeEnter.y0 - 12)
           .attr("x", -12)// nodeEnter.x0 - 12)
          .attr("height", 25)
          .attr("width",  function(d) {
            var textLen = 25;
             if ( typeof(d.value) != "undefined" && d.value != "" && d.value !== null ) {
                if ( isNaN(d.value) ) {
                    textLen = 25 + d.value.length*8;
                } else { 
                    var ds = d.value.toString(); 
                    textLen = 25 + ds.length*8; } 
             }
             return textLen;
          })
          .style("fill", '#ccc')
          .on("click", function(d) { console.log("im so square")});

        nodeEnter.append("text")
            .attr("x", function(d) {
                return d.children || d._children ? 0 : 10;
            })
            .attr("y", function(d) {
                return d.children || d._children ? -20 : 0;
            })
            .attr("dy", ".35em")
            .attr('class', 'nodeText')
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "start" : "start";
            })
            .html("<div>I am here</div>")
            .text(function(d) {
                var mz = d.name + ":" + d.value;
                return mz;
            })
            .style("fill-opacity", 0);

        // phantom node to give us mouseover in a radius around it
        nodeEnter.append("circle")
            .attr('class', 'ghostCircle')
            .attr("r", 30)
            .attr("opacity", 0.2) // change this to zero to hide the target area
        .style("fill", "red")
            .attr('pointer-events', 'mouseover')
            .on("mouseover", function(node) {
               // console.log("phantom node here");
            });


        // Update the text to reflect whether node has children or not.
        node.select('text')
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "start" : "start";
            })
            .attr('class', function(d) {
                ( typeof(d.display) != "undefined" && d.display != "" ) ? 'nodeTextVal': 'nodeText';
            })
            .html(function(d) {
               var dText;
               var dValue;
              
                ( typeof(d.display) != "undefined" && d.display != "" ) ? dText = d.display: dText = d.name;
                ( typeof(d.value) != "undefined" && d.value != "" ) ? dValue = d.value: dValue = dText;
                if ( typeof(d.datatype) != "undefined" && d.datatype == "textarea"  ) {
                        if ( typeof(d.value) != "undefined") {
                           if ( d.value.length >= 50 ) {
                               var rStr = d.value.substring(0,50) + '...';
                               return rStr; }
                           else if ( d.value.length == 0 ) { return d.name }
                           else { 
                            return d.value }
                        } else { return d.name }
                }
                return d.children || d._children ?  dText  : dValue;

            });

        // Change the circle fill depending on whether it has children and is collapsed
        node.select("circle.nodeCircle")
            .attr("r", function(d) { 
                  var CircSize = 6;
                 typeof(d.value) != "undefined" && d.value != "" ? CircSize = CircSize + 2: CircSize = CircSize -1;
                 d.children || d._children  ?  CircSize = CircSize + 2: CircSize = CircSize -1; 
                 if  ( typeof(d.datatype) !== "undefined" && d.datatype == "bbox" ) { CircSize = 10; } 
                 return CircSize;
                
            })
            .style("fill", function(d) {
                var cirColor = "#fff"
                if  ( typeof(d.value) != "undefined" && d.value != "" ) 
                    { cirColor = "#8cc"; 
                   } else if ( d.children || d._children ) 
                    { cirColor ="#88c"; } 
                if  ( typeof(d.datatype) != "undefined" && d.datatype == "array" ) 
                    { cirColor = "#f44"; }
                if  ( typeof(d.datatype) != "undefined" && d.datatype == "bbox" ) 
                    { cirColor = "#4e4"; }
                return cirColor;
            });

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y  + "," + d.x + ")";
            });

        // Fade the text in
        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 15);

        nodeExit.select("text")
            .style("fill-opacity", 0);

        // Update the links…
        var link = svgGroup.selectAll("path.link")
            .data(links, function(d) {
               //  console.log("target id" + d.target.id + " " + d.target.value);
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", function(d) {
                 // console.log("D is " + d.name);
                  if ( typeof(d.target.value) != "undefined" && d.target.value != "") 
                   { return "link"; 
                   } else { return "link"; }
            })
            .attr("d", function(d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .style("stroke-width", function(d) {
                 // console.log("D is " + d.name);
                  if ( typeof(d.target.required) != "undefined" && d.target.required == "true") 
                   { return "3.0px"; 
                   }                   
                  if ( typeof(d.target.value) != "undefined" && d.target.value != "") 
                   { return "3.0px"; 
                   } else { return "1.5px"; }
            })           
            .style("stroke", function(d) {
                 // console.log("D is " + d.name);

                if ( typeof(d.target.value) != "undefined" && d.target.value != "") 
                   { return "#cc4"; }  // populated
                if ( typeof(d.target.required) != "undefined" && d.target.required == "true") 
                   { return "#c44"; }  //required empty
                 return "#ccc"; 
            });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

       jData = json_xporter();
    }

    // Append a group which holds all nodes and which the zoom Listener can act upon.
    var svgGroup = baseSvg.append("g");

    // Define the root
    root = treeData;
    root.x0 = 0; //viewerHeight;
    root.y0 = 0;

    // Layout the tree initially and center on the root node.
    update(root);
    // centerNode(root);
}

