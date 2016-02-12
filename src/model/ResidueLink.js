//		xiNET cross-link viewer
//		Copyright 2013 Rappsilber Laboratory, University of Edinburgh
//
//		author: Colin Combe
//		
//		ResidueLink.js
// 		the class representing a residue-residue link

"use strict";

ResidueLink.prototype = new xiNET.Link();

function ResidueLink(id, proteinLink, fromResidue, toResidue, xlvController, flip) {
    this.id = id;
    //    this.matches = new Array(0); //we don't initialise this here 
    // (save some memory in use case where there is no match info, only link info)
    this.controller = xlvController;
    this.proteinLink = proteinLink;
    this.fromResidue = fromResidue;
    this.toResidue = toResidue;
    this.ambig = false;
    this.tooltip = this.id;
    if (flip === true) {
        this.flip = true;
    }
    //used to avoid some unnecessary manipulation of DOM
    this.shown = false;
    this.dashed = false;
    this.initSVG();
}

ResidueLink.prototype.initSVG = function() {
    if (typeof this.line === 'undefined') {
        if (this.selfLink() === true || this.proteinLink.toProtein === null) {
            this.line = document.createElementNS(xiNET.svgns, "path");
            this.highlightLine = document.createElementNS(xiNET.svgns, "path");
        } else {
            this.line = document.createElementNS(xiNET.svgns, "line");
            this.line.setAttribute("stroke", xiNET.defaultInterLinkColour.toRGB());
            this.line.setAttribute("stroke-linecap", "round");
            this.highlightLine = document.createElementNS(xiNET.svgns, "line");
            this.highlightLine.setAttribute("stroke-linecap", "round");
        }

        this.line.setAttribute("class", "link");
        this.line.setAttribute("fill", "none");
        this.highlightLine.setAttribute("class", "link");
        this.highlightLine.setAttribute("fill", "none");
        this.highlightLine.setAttribute("stroke", xiNET.highlightColour.toRGB());
        this.highlightLine.setAttribute("stroke-width", "10");
        this.highlightLine.setAttribute("stroke-opacity", "0")

        if (typeof this.colour !== 'undefined'){
            this.line.setAttribute("stroke", this.colour);
        }

        //set the events for it
        var self = this;
        this.line.onmousedown = function(evt) {
            self.mouseDown(evt);
        };
        this.line.onmouseover = function(evt) {
            self.mouseOver(evt);
        };
        this.line.onmouseout = function(evt) {
            self.mouseOut(evt);
        };
        this.line.ontouchstart = function(evt) {
			self.touchStart(evt);
		};

        this.highlightLine.onmousedown = function(evt) {
            self.mouseDown(evt);
        };
        this.highlightLine.onmouseover = function(evt) {
            self.mouseOver(evt);
        };
        this.highlightLine.onmouseout = function(evt) {
            self.mouseOut(evt);
        };
        this.highlightLine.ontouchstart = function(evt) {
			self.touchStart(evt);
		};
    }
    this.isSelected = false;
};

ResidueLink.prototype.selfLink = function() {
	return (this.proteinLink.fromProtein === this.proteinLink.toProtein);
}

ResidueLink.prototype.getFromProtein = function() {
    return this.proteinLink.fromProtein;
};

ResidueLink.prototype.getToProtein = function() {
    return this.proteinLink.toProtein;
};

//andAlternatives means highlight alternative links in case of site ambiguity
ResidueLink.prototype.showHighlight = function(show, andAlternatives) {
	if (!this.proteinLink.fromProtein.busy && (!this.proteinLink.toProtein || !this.proteinLink.toProtein.busy)) { 
		if (typeof andAlternatives === 'undefined') {
			andAlternatives = false;
		}
		if (this.shown) {
			if (show) {
				this.highlightLine.setAttribute("stroke", xiNET.highlightColour.toRGB());
				this.highlightLine.setAttribute("stroke-opacity", "0.7"); 
				var fromPeptides = [], toPeptides = [];
				var filteredMatches = this.getFilteredMatches();
				var fmc = filteredMatches.length;
				for (var m = 0; m < fmc; m++) {
					var match = filteredMatches[m][0];
							
					var fromPepStart = filteredMatches[m][1] - 1;
					var fromPepLength = filteredMatches[m][2];
					var toPepStart = filteredMatches[m][3] - 1;
					var toPepLength = filteredMatches[m][4];
					
					fromPeptides.push([fromPepStart, fromPepLength, match.overlap[0], match.overlap[1]]);
					toPeptides.push([toPepStart, toPepLength, match.overlap[0], match.overlap[1]]);
				}
				this.proteinLink.fromProtein.showPeptides(fromPeptides);  
				if (this.proteinLink.toProtein !== null) {
					this.proteinLink.toProtein.showPeptides(toPeptides);  
				}		
				var temp = d3.map();
				temp.set(this.id, this);
				this.controller.linkHighlightsChanged(temp);	
			} else {
				this.highlightLine.setAttribute("stroke", xiNET.selectedColour.toRGB());
				if (this.isSelected == false) {
					this.highlightLine.setAttribute("stroke-opacity", "0");
				}
				this.proteinLink.fromProtein.removePeptides();  
				if (this.proteinLink.toProtein !== null) {
						this.proteinLink.toProtein.removePeptides();  	
				}
				this.controller.linkHighlightsChanged(d3.map());
			}
		}
		if (andAlternatives && this.ambig) {
			//TODO: we want to highlight smallest possible set of alternatives?
			var mc = this.matches? this.matches.length : 0;
			for (var m = 0; m < mc; m++) {
				var match = this.matches[m][0];
				if (match.isAmbig()) {
					var rc = match.residueLinks.length;
					for (var rl = 0; rl < rc; rl++) {
						var resLink = match.residueLinks[rl];
					 //   if (resLink.isSelected == false) { //not right
							resLink.showHighlight(show, false);
							resLink.proteinLink.showHighlight(show, false);
					 //}
					}
				}
			}
		}
	}
};

ResidueLink.prototype.setSelected = function(select) {
    if (select === true && this.isSelected === false) {
        this.controller.selectedLinks.set(this.id, this);
        this.isSelected = true;
        this.highlightLine.setAttribute("stroke", xiNET.selectedColour.toRGB());
		this.highlightLine.setAttribute("stroke-opacity", "0.7");
		this.controller.linkSelectionChanged();
    }
    else if (select === false && this.isSelected === true) {
        this.controller.selectedLinks.remove(this.id);
        this.isSelected = false;
        this.highlightLine.setAttribute("stroke-opacity", "0");
        this.highlightLine.setAttribute("stroke", xiNET.highlightColour.toRGB());
        this.controller.linkSelectionChanged();
	}
};

ResidueLink.prototype.getFilteredMatches = function() {
    this.ambig = true;
    this.hd = false;
    this.intraMolecular = false; //i.e. type 1, loop link, intra peptide, internally linked peptide, etc 
    var filteredMatches = [];
    var count = this.matches? this.matches.length : 0;
    for (var i = 0; i < count; i++) {
        var match = this.matches[i][0];
        if (match.meetsFilterCriteria()) {
            filteredMatches.push(this.matches[i]);
            if (match.isAmbig() === false) {
                this.ambig = false;
            }
            if (match.hd === true) {
                this.hd = true;
            }            
            if (match.type === 1){
				this.intraMolecular = true;
			}
        }
    }
    return filteredMatches;
};

//used when filter changed
ResidueLink.prototype.check = function(filter) {
    if (this.controller.selfLinkShown === false && this.selfLink()) {
        this.hide();
        return false;
    }
    if (this.proteinLink.hidden) {
        this.hide();
        return false;
    }
    if (typeof this.matches === 'undefined' || this.matches == null) {
		this.ambig = false;
		this.show();
		return true;
    }
    var filteredMatches = this.getFilteredMatches();
    var countFilteredMatches = filteredMatches.length;
    if (countFilteredMatches > 0) {
        this.show();
        this.dashedLine(this.ambig);		
        if (this.controller.groups.values().length > 1 && this.controller.groups.values().length < 11) {
			var groupCheck = d3.set();
            for (var i=0; i < countFilteredMatches; i++) {
                var match = filteredMatches[i][0];//fix this weirdness with array?
				groupCheck.add(match.group);
			}
			if (groupCheck.values().length == 1){
				var c = this.controller.linkColours(groupCheck.values()[0]);
				this.line.setAttribute("stroke", c);				
          		this.line.setAttribute("transform", "scale (1 1)");
				this.highlightLine.setAttribute("transform", "scale (1 1)");
			}
			else  {
				this.line.setAttribute("stroke", "#000000");
				if (this.selfLink()){
					this.line.setAttribute("transform", "scale (1 -1)");
					this.highlightLine.setAttribute("transform", "scale (1 -1)");
				}
            }
            //else this.line.setAttribute("stroke", "purple");//shouldn't happen				
		}
        else if (this.selfLink() === true && this.colour == null){
			if (this.hd === true) {
				this.line.setAttribute("stroke", xiNET.homodimerLinkColour.toRGB());			
				this.line.setAttribute("transform", "scale(1, -1)");			
				this.line.setAttribute("stroke-width", xiNET.homodimerLinkWidth);			
				this.highlightLine.setAttribute("transform", "scale(1, -1)");			
			}
			else {
				this.line.setAttribute("stroke", xiNET.defaultSelfLinkColour.toRGB());	
				this.line.setAttribute("transform", "scale(1, 1)");			
				this.line.setAttribute("stroke-width", xiNET.linkWidth);			
				this.highlightLine.setAttribute("transform", "scale(1, 1)");			
			}
		}
		else if (this.selfLink() === true) {
			this.line.setAttribute("stroke-width", xiNET.linkWidth);			
		}		
		this.tooltip = this.proteinLink.fromProtein.labelText + '_' + this.fromResidue
                    + "-"  + ((this.proteinLink.toProtein != null)? this.proteinLink.toProtein.labelText:'null') 
                    + '_' + this.toResidue + ' (' + countFilteredMatches;
        if (countFilteredMatches == 1) {
            this.tooltip += ' match)';
        } else {
            this.tooltip += ' matches)';
        }


        return true;
    }
    else {
        this.hide();
        return false;
    }
};

ResidueLink.prototype.dashedLine = function(dash) {
	if (this.controller.unambigLinkFound == true) {
		if (typeof this.line !== 'undefined' && !isNaN(parseFloat(this.toResidue))) {
			if (dash) {// && !this.dashed){
				if (this.selfLink() === true) {
					this.dashed = true;
					this.line.setAttribute("stroke-dasharray", (4) + ", " + (4));
				}
				else {
					this.dashed = true;
					this.line.setAttribute("stroke-dasharray", (4 * this.controller.z) + ", " + (4 * this.controller.z));
				}
			}
			else if (!dash) {// && this.dashed){
				this.dashed = false;
				this.line.removeAttribute("stroke-dasharray");
			}
		}
	}
};

ResidueLink.prototype.show = function() {
    if (this.controller.sequenceInitComplete) {
        if (!this.shown) {
            this.shown = true;
            if (typeof this.line === 'undefined') {
                this.initSVG();
            }
            if (this.selfLink() || this.proteinLink.toProtein === null) {
                //~ this.line.setAttribute("stroke-width", xiNET.linkWidth);
                var path =  this.proteinLink.fromProtein.getResidueLinkPath(this);
                this.line.setAttribute("d", path);
                this.highlightLine.setAttribute("d", path);
                this.proteinLink.fromProtein.selfLinksHighlights.appendChild(this.highlightLine);
                this.proteinLink.fromProtein.selfLinks.appendChild(this.line);
            }
            else {
                this.line.setAttribute("stroke-width", this.controller.z * xiNET.linkWidth);
                this.highlightLine.setAttribute("stroke-width", this.controller.z * 10);
                this.setLineCoordinates(this.proteinLink.fromProtein);
                this.setLineCoordinates(this.proteinLink.toProtein);
                this.controller.highlights.appendChild(this.highlightLine);
                this.controller.res_resLinks.appendChild(this.line);
            }
        }
    }
};

ResidueLink.prototype.hide = function() {
    if (this.controller.sequenceInitComplete) {
        if (this.shown) {
            this.shown = false;
            if (this.selfLink() || this.proteinLink.toProtein === null) {
                this.proteinLink.fromProtein.selfLinksHighlights.removeChild(this.highlightLine);
                this.proteinLink.fromProtein.selfLinks.removeChild(this.line);
            }
            else {
                this.controller.res_resLinks.removeChild(this.line);
                this.controller.highlights.removeChild(this.highlightLine);
            }
        }
    }
};

ResidueLink.prototype.setLineCoordinates = function(interactor) {
	//a defensive check
    if (interactor.x == null || interactor.y == null) {
        return;
    }
	//non self, not linker modified pep's links only 
	if (this.selfLink() === false && this.getToProtein() !== null){
		//don't waste time changing DOM if link not visible
		if (this.shown) {
			var x, y;
			if (this.getFromProtein() === interactor) {
				if (interactor.form === 0) {
						x = interactor.x;
						y = interactor.y;
				}
				else //if (this.form == 1)
				{
					var coord = this.getResidueCoordinates(this.fromResidue, interactor);
					x = coord[0];
					y = coord[1];
				}
				this.line.setAttribute("x1", x);
				this.line.setAttribute("y1", y);
				this.highlightLine.setAttribute("x1", x);
				this.highlightLine.setAttribute("y1", y);				
			}
			else if (this.getToProtein() === interactor) {
				if (interactor.form === 0) {
						x = interactor.x;
						y = interactor.y;
				}
				else //if (this.form == 1)
				{
					var coord = this.getResidueCoordinates(this.toResidue, interactor);
					x = coord[0];
					y = coord[1];
				}
				this.line.setAttribute("x2", x);
				this.line.setAttribute("y2", y);
				this.highlightLine.setAttribute("x2", x);
				this.highlightLine.setAttribute("y2", y);			
			}
		}
	}
}

//calculate the  coordinates of a residue (relative to this.controller.container)
ResidueLink.prototype.getResidueCoordinates = function(r, interactor) {
    var x = interactor.getResXwithStickZoom(r) * this.controller.z;
    //var x = (r - (this.size/2)) * Protein.UNITS_PER_RESIDUE * this.stickZoom * this.controller.z;
    var y = 0;
    if (Protein.UNITS_PER_RESIDUE * interactor.stickZoom > 8) {//if sequence shown
			//~ y = 10 * this.controller.z;
		var from = this.getFromProtein(), to = this.getToProtein();
		var deltaX = from.x - to.x;
		var deltaY = from.y - to.y;
		var angleBetweenMidPoints = Math.atan2(deltaY, deltaX);
		//todo: tidy up trig code so eveything is always in radians?
		var abmpDeg = angleBetweenMidPoints / (2 * Math.PI) * 360;
		if (abmpDeg < 0) {
			abmpDeg += 360;
		}
		
		var out;//'out' is value we use to decide which side of letter the line is drawn
		if (interactor === from) {
				out = (abmpDeg - from.rotation);
				if (out < 0) {
					out += 360;
				}
				var fyOffset = 5;
				if (out < 180) {
					fyOffset = -5;
				}
				
				y = fyOffset * this.controller.z;
		}
		else { // interactor === to
				out = (abmpDeg - to.rotation);
				if (out < 0) {
					out += 360;
				}
				var tyOffset = 5;
				if (out > 180) {
					tyOffset = -5;
				}
				y = tyOffset * this.controller.z;
		}
	}

	var rotated = Protein.rotatePointAboutPoint([x, y],[0,0],interactor.rotation);

    x = rotated[0] + interactor.x;
    y = rotated[1] + interactor.y;
    return [x, y];
};


// used by hover highlight?
ResidueLink.prototype.leastAmbiguousMatches = function() {// yes: plural
    //var leastAmbigMatches
    };

ResidueLink.prototype.toJSON = function() {
    var m = [];
    var mc = this.matches.length;
    for (var i = 0; i < mc; i++) {
        m.push(this.matches[i].id);
    }
    return {
    //      m: m
    };
};
