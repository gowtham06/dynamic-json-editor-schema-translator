/* Client side transform tools
   This allows the client to translate the incoming package, and translate the edited
   package before saving.    
   G. Hudman April 21, 2016
*/

var found = "";

// newJson is in d3 format loaded with Source data
function xform(d3json, mdjson) {
    var kp;
	var newJson = altransverse(d3json,kp,mdjson);
	return newJson;
}

function transverseX(d3,kp,md) {
	return d3;
}

// Transverse performs incoming translation
function transverse(d3,kp,md) {

	kp = kp || [];
	for (var i in d3) {
		if (d3[i] !== null && typeof(d3[i])=="object" ) {
			console.log(' transverse step ' + d3[i].name + ' ' + i);

			if ( d3[i].ref !== "undefined" ) {
				var mdlookup = d3[i].ref;
				if ( typeof(mdlookup) !== "undefined" && mdlookup !== null ) {
                    var jT;
					var refval = jsonLookup(md, jT,mdlookup);
					console.log(' t step  lookup ' + d3[i].name + ' ' + refval);					
					if ( typeof(refval) !== "undefined" && refval !== null ) {
						d3[i].value = refval;
					}
					found="";
				}	
			}
			d3[i] = transverse(d3[i],kp.concat(i),md);
		} else {
			if ( d3[i].ref !== "undefined" ) { 
				var mdendlook = d3[i].ref;
				if ( typeof(mdendlook) !== "undefined" && mdendlook !== null ) {
					var ejT;
					var endref = jsonLookup(md, ejT,mdendlook);
                    console.log(' t end lookup' +  d3[i].name + ' ' + endref);
					if ( typeof(endref) !== "undefined"  && endref !== null ) {
						d3[i].value = endref;
					}
				}
			}
		}
	}
	return d3;
}

function jsonLookup(jsonObj, trail, keylookup) {
	trail = trail || [];	
	for (var key in jsonObj) {
	    if ( jsonObj[key] !== null && typeof(jsonObj[key])=="object" ) { 
           		jsonLookup(jsonObj[key], trail.concat(key), keylookup );
        } else { 
			var fullkey = trail.join(".") + "." + key;
			if ( keylookup == fullkey ) {
			        found = jsonObj[key];
					return found;
			}
		}
		//}
    }    
	return found;
}

// altraverse allows the build of n-children based on a single child schema structure
// Todo: add reference lookup array handling 6/2


function altransverse(d3,kp,md) {

	kp = kp || [];

    console.log(' Alt Transverse entry point '); // + JSON.stringify(md));
	for (var i in d3) {
		console.log(' Alt step ' + d3[i] + ' - ' + i + ' type is ' + typeof(d3[i]) + 'x' );
		if (d3[i] !== null && typeof(d3[i])=="object" ) {
            var iObj = d3[i];
            if ( d3[i].ref !== "undefined" ) {
            	var mdlookup = d3[i].ref;
            	if ( typeof(mdlookup) !== "undefined" && Array.isArray(mdlookup) ) {

            		for (var k in mdlookup) {
            			var mdarrLookup = jsonLookup(md, ajT,mdlookup[k]);
            			if (mdarrLookup) {
            				mdlookup= mdlookup[k];
            				break;	
            			}
            			// what to do if nothin found
            		}
            	}
            	console.log('object ref ' + mdlookup);
            	if ( typeof(d3[i].datatype) !== "undefined" && d3[i].datatype == "array"  ) {
            		console.log('an array ');
            		var jASchema = d3[i].children[0];
            		console.log('child  ' + jASchema);
            		var ajT;
					var mdArray = jsonLookup(md, ajT,mdlookup);
					console.log(' got array   ' + mdArray);
					if ( typeof(mdArray) !== "undefined" && Array.isArray(mdArray) ) {
						console.log(' found it - process an array ');
						// build a new array using schema format and source data 
						var dArr = jsonArray(mdArray, jASchema);
						d3[i].children = dArr;
                        console.log(' returned array ' + JSON.stringify(dArr));

					}
            	} else {
            		if ( typeof(mdlookup) !== "undefined" && mdlookup !== null ) {
                    	var jT;
						var refval = jsonLookup(md, jT,mdlookup);
						//console.log('obj lookup' + mdlookup + ': ' + refval);
						if ( typeof(refval) !== "undefined" && refval !== null ) {
							d3[i].value = refval;
						}
						found="";
            		}
            	    d3[i] = altransverse(d3[i],kp.concat(i),md);	
            	}
            }
            
		} else {
			console.log(' Alt traverse end point ' + i + ' ' + d3[i]);
			if ( typeof(d3[i].ref) !== "undefined" ) { 
				var mdendlook = d3[i].ref;
                 if ( typeof(mdendlook) !== "undefined" && Array.isArray(mdendlook) ) {
            		for (var k in mdendlook) {
            			var mdarrLookup = jsonLookup(md, ajT,mdendlook[k]);
            			if (mdarrLookup) {
            				mdendlook= mdendlook[k];
            				break;	
            			}
            			// what to do if nothin found
            		}
            	}
				if ( typeof(mdendlook) !== "undefined" && mdendlook !== null ) {
					var ejT;
					var endref = jsonLookup(md, ejT,mdendlook);
                    //console.log('end lookup' + mdendlookup);
					if ( typeof(endref) !== "undefined"  && endref !== null ) {
						d3[i].value = endref;
					}
				}
			}
		}
	}
	return d3;
}

function jsonArray(mdJson, jASchema ) {
	console.log("array builder " + mdJson.length);
    var newArray =[];
	if ( mdJson.length > 0 ) {

        for (var i = 0; i < mdJson.length; i++) {
        	console.log("ab " + i + ' ' + mdJson[i].name );
        	 var tjs = {};
        	 tjs = JSON.parse(JSON.stringify(jASchema));
             tjs.value = mdJson[i].name;
             tjs.array_index = i;
             console.log("wtf " + JSON.stringify(tjs));
			 newArray.push(tjs);
		    //newArray[i].value = mdJson[i].name;
		    //newArray[i].array_index = i;
		}
	} else {
		// Build empty array item
	    newArray.push(jASchema);
	    newArray[i].name = "default";
		newArray[i].array_index = 0;
	}

	return newArray;
}

// This translates data on the way out
// traverse the d3 edited schema and apply values to any reference points
// NGDS -specific join the md_package to the full data package
// and translate any md_package dat to the outer package

var apply_edits = function(d3edits, fullpack, mdPack) {
	 var kp;
	 mdlookup(d3edits,kp, mdPack, fullpack);
	 // join fullpackage and md_package 
	 for (i = 0; i < fullpack.extras.length; i++) {
  		if (fullpack.extras[i].key === 'md_package') {
  			fullpack.extras[i].value = JSON.stringify(mdPack);
  		}
  	}
}

var mdlookup = function (d3edits, kp, mdPack, fullpack) {

	kp = kp || [];
	if (typeof(d3edits.ref) !== "undefined" && d3edits.ref !== null ) {
    	if (typeof(d3edits.value) !== "undefined" && d3edits.value !== null ) {
    		var mdk;
			var rtnU = mdUpdate(mdPack, mdk, d3edits.ref, d3edits.value ); 
			if ( !rtnU ) {
				console.log(' not found ' + d3edits.ref );
				// not right builds composite key 
				// kode needs to split the key then loop thru until it hits end poitn
				// once at the endpoint - extend parent 
               // mdPack[ d3edits.ref ] = d3edits.value;
               var mx = d3edits.ref;
                if ( typeof(mx) !== "undefined" && Array.isArray(mx) ) {
                	var mz = mx[0];
                } else { mz = mx; }

               // 
               var my = mz.lastIndexOf('.');
               if ( my > 0 ) {
			   		var mdPar = mz.substr(0, my);
			   } else {
			   		mdPar = mz;
			   }
                
				//var newMD = {};
				//newMD[d3edits.ref ] = d3edits.value;
				//$.extends(true, mdPack.push(newMD);
			
			}   		
			//console.log('Uprtn' + rtnU);
    	}
    }

    // If it extends outside of md_package

	if ( typeof(d3edits.package_ref) !== "undefined" && d3edits.package_ref !== null ) {
		if (typeof(d3edits.value) !== "undefined" && d3edits.value !== null ) {
    		var mdk;
    		var mt = mdUpdate(fullpack, mdk, d3edits.package_ref, d3edits.value );

			if ( mt ) {
				console.log(' outside md find ' + d3edits.package_ref);		

			} else { console.log('outside md no find');
		    } 
			    		
    	}
	}

    if ( typeof(d3edits.children) !== "undefined") {
		for (var i = 0; i < d3edits.children.length; i++) {
			mdlookup(d3edits.children[i],kp,mdPack, fullpack )
		}

	}
}


var mdUpdate = function(jsonObj, mdk, lookup, value) {

	mdk = mdk || [];

	for (var key in jsonObj) {
		//console.log(' update key ' + key  + ' ' + lookup + ' ' + value);
	    if ( jsonObj[key] !== null && typeof(jsonObj[key])=="object" ) { 
           		var fmd = mdUpdate(jsonObj[key], mdk.concat(key), lookup, value );
        } else { 
        	    //this handles when lookups are arrays, get the first one
            if ( typeof(lookup) !== "undefined" && Array.isArray(lookup) ) {
              	var mx = lookup[0];
            } else { mx = lookup; }

        	if ( mdk.length < 1 ) { var fullkey = key; }
        	else {
				var fullkey = mdk.join(".") + "." + key; }
			if (mx == fullkey ) {	
			//if (lookup == fullkey ) {
			    jsonObj[key] = value;
				return true;
			}
		}
		//}
    }  
    // lookup wasnt found then create it
    if ( !fmd ) {

    	  if ( typeof(lookup) !== "undefined" && Array.isArray(lookup) ) {
                var mx = lookup[0];
          } else { mx = lookup; }

    	var lKey = mx.lastIndexOf(".");
    	if ( lKey > 0 ) { lPath = mx.substr(lKey + 1); }
    	else { lPath = lookup; }
    	var newJ = {};
    	newJ[lPath] = value;
    	$.extend(jsonObj,newJ);
    	console.log(' added new ' + mx  + ' with ' + value);
    	return true;

    }
    return fmd;
}








