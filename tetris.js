

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
class Queue {
    constructor(size)
    {
        this.data = [];
        this.data.length = size;
        this.start = 0;
        this.end = 0;
        this.length = 0;
    }
    push(val)
    {
        if(this.length == this.data.length)
        {
            throw new Error("Error queue limit reached!");
        }
        else
        {
            this.data[this.end++] = val; 
            this.end %= this.data.length;
            this.length++;
        }
    }
    pop()
    {
        if(this.length)
        {
            const val = this.data[this.start];
            this.start++;
            this.start %= this.data.length;
            this.length--;
            return val;
        }
        throw new Error("No more values in the queue");
    }
    get(index)
    {
        if(index < this.length)
        {
            return this.data[(index+this.start)%this.data.length];
        }
		throw new Error(`Could not get value at index ${index}`);
    }
    set(index, obj)
    {
        if(index < this.length)
        {
            this.data[(index+this.start)%this.data.length] = obj;
        }
		throw new Error(`Could not set value at index ${index}`);
    }
}

class Field{
    constructor(canvas, ctx, maxLevel)
    {
        this.canvas = canvas;
        this.ctx = ctx;
        this.boundedWidth = canvas.width/8*5;
        this.boundedHeight = canvas.height;
        this.w = 10;
        this.h = 25;
        this.mousePos = {x:0, y:0};
        this.active = true;
        this.score = 0;
        this.level = 0;
        this.maxLevel = maxLevel+1;
        this.lastRowsCleared = 0;
        this.pieceTypes = [
            //T
            {
                type:"t",
                center: [this.w/2,1],
                vectors:[[0,0],[-1,-1],[0,-1],[1,-1]],
                color:"#A000B8"//
            },
            //O
            {
                type:"o",
                center: [this.w/2,1],
                vectors:[[0,0],[-1,-1],[0,-1],[-1,0]],
                color:"#D0D000"//
            },
            //Z
            {
                type:"z",
                center: [this.w/2,1],
                vectors:[[0,0],[-1,-1],[0,-1],[1,0]],
                color:"#AA0A00"//
            },
            //S
            {
                type:"s",
                center: [this.w/2,1],
                vectors:[[0,0],[-1,0],[0,-1],[1,-1]],
                color:"#00C000"//
            },
            //i
            {
                type:"i",
                center: [this.w/2,1],
                vectors:[[0,-1],[0,0],[0,1],[0,2]],
                color:"#00A0D0"//
            },
            //L
            {
                type:"l",
                center: [this.w/2,1],
                vectors:[[-1,-1],[-1,0],[-1,1],[0,1]],
                color:"#F0B000"//
            },
            //j
            {
                type:"j",
                center: [this.w/2,1],
                vectors:[[1,-1],[1,0],[1,1],[0,1]],
                color:"#0020D0"//blue
            }

        ];
        this.touchStart;
        this.lastTouchTime = Date.now();
        this.lastTouchStart;
        this.ignoreEndTouch = false;
        this.piecePosAtTouchStart = [0,0];
        this.holdPiece = {type:"null",center:[0,0],vectors:[], color:"#000000"};
        this.livePiece = this.genRandomNewPiece();
        this.field = [];
        this.pieceQueue = new Queue(5);
        for(let i = 0; i < this.pieceQueue.data.length; i++)
        {
            this.pieceQueue.push(this.genRandomNewPiece());
        }
        for(let i = 0; i < this.w*this.h;i++)
        {
            this.field.push({color:"#000000"});
        }
    }
    genRandomNewPiece()
    {
        return this.clonePiece(this.pieceTypes[Math.floor(Math.random() * (this.pieceTypes.length))]);
    }
    clonePiece(piece)
    {
        const newPiece = {type:piece.type,center:[piece.center[0], piece.center[1]], vectors:[], color:piece.color};
        for(let i = 0; i < piece.vectors.length; i++)
            newPiece.vectors.push([piece.vectors[i][0],piece.vectors[i][1]]);
 
        return newPiece;
    }
    rotateRight(piece){
        for(let i = 0; i < piece.vectors.length; i++)
        {
            const temp = piece.vectors[i][1]*-1;
            piece.vectors[i][1] = piece.vectors[i][0];
            piece.vectors[i][0] = temp;
        }
    }
    isClear(piece)
    {
        for(let i = 0; i < piece.vectors.length; i++)
        {
            const point = [piece.vectors[i][0]+piece.center[0], piece.vectors[i][1]+piece.center[1]];
            if(this.field[point[0] + point[1]*this.w].color != "#000000")
            {
                return false;
            }
        }
        return true;
    }
    onMouseMove(event)
    {
        if(!this.active){
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos.x = event.clientX-rect.left;
        this.mousePos.y = event.clientY-rect.top;
        }
    }
    moveRight()
    {
        this.clear(this.livePiece);
        if(this.isClearTranslated(this.livePiece, [1,0]))
            this.livePiece.center[0]++;
        this.place(this.livePiece);
    }
    moveLeft()
    {
        this.clear(this.livePiece);
        if(this.isClearTranslated(this.livePiece, [-1,0]))
            this.livePiece.center[0]--;
        this.place(this.livePiece);
    }
    rotate()
    {
        if(this.livePiece.type != "o")
        {
            this.clear(this.livePiece);
            const newPiece = this.clonePiece(this.livePiece);
            this.rotateRight(newPiece);
            if(this.isClearTranslated(newPiece,[0,0])){
                this.livePiece = newPiece;
            }
            this.place(this.livePiece);
        }
    }
    holdLive()
    {
        this.clear(this.livePiece);
            const type = this.livePiece.type;
            let old = this.pieceTypes.find(el => el.type === type);
            old.center = [this.w/2, 1];
            this.piecePosAtTouchStart = [this.w/2, 1];
            if(this.holdPiece && this.holdPiece.type != "null")
            {
                this.livePiece = this.holdPiece;
            }
            else
            {
                this.livePiece = this.pieceQueue.pop();
                this.pieceQueue.push(this.genRandomNewPiece());
            }
            this.holdPiece = old;
            this.place(this.livePiece);
    }
    hardDrop()
    {
        this.clear(this.livePiece);
        while(this.isClearBelow(this.livePiece))
            this.livePiece.center[1]++;
        this.place(this.livePiece);
        this.livePiece = this.pieceQueue.pop();
        this.pieceQueue.push(this.genRandomNewPiece());
        this.livePiece.center = [this.w/2, 1];
        this.place(this.livePiece);
    }
    moveDown()
    {
        this.clear(this.livePiece);
        if(this.isClearTranslated(this.livePiece, [0,1]))
            this.livePiece.center[1]++;
        this.place(this.livePiece);
    }
    onKeyPress(event)
    {
        if(this.active)
        if(event.code === "Space")//Hard drop
        {
            this.hardDrop();
        }
        else if((event.code === "KeyW" || event.keyCode === 38))//rotate
        {
            this.rotate();
        }
        else if(event.code === "KeyA" || event.keyCode === 37)//move/translate left
        {
            this.moveLeft();
        }
        else if(event.code === "KeyD" || event.keyCode === 39)//move/translate right
        {
            this.moveRight();
        }
        else if(event.code === "KeyS" || event.keyCode === 40)//move/translate down
        {
            this.moveDown();
        }
        else if(event.code == "KeyE")//Hold piece implementation
        {
            this.holdLive();
        }
        if(event.code === "KeyP")//pause/unpause
        {
            this.active = !this.active;
        }
    }
    clear(piece)
    {
        for(let i = 0; i < piece.vectors.length; i++)
        {
            const point = [piece.vectors[i][0]+piece.center[0], piece.vectors[i][1]+piece.center[1]];
            this.field[point[0] + point[1]*this.w].color = "#000000";
        }
    }
    isClearTranslated(piece, vector)
    {
        const center = [piece.center[0]+vector[0], piece.center[1]+vector[1]];
        for(let i = 0; i < piece.vectors.length; i++)
        {
            const point = [piece.vectors[i][0]+center[0], piece.vectors[i][1]+center[1]];
            if(point[1] >= this.h || point[0] < 0 || point[0] >= this.w)
                return false;
            else if(this.field[point[0] + point[1]*this.w].color != "#000000")
                return false;
        }
        return true;
    }
    isClearBelow(piece)
    {
        return this.isClearTranslated(piece, [0,1]);
    }
    gameOver()
    {
        //reset level, and score
        this.level = 0;
        this.score = 0;
        //set hold piece to empty for new game
        this.holdPiece = {type:"null",center:[0,0],vectors:[], color:"#000000"};
        //reset piece queue
        for(let i = 0; i < this.pieceQueue.length; i++)
            this.pieceQueue[i] = this.genRandomNewPiece();
        //reset field for drawing
        for(let i = 0; i < this.field.length; i++)
            this.field[i].color = "#000000";
    }
    getFilledRows()
    {
        const arr = [];
        for(let y = 0; y < this.h; y++)
        {
            let full = true;
            for(let x = 0; full && x < this.w; x++)
            {
                full = this.field[x + y*this.w].color != "#000000";
            }
            if(full)
                arr.push(y);
        }
        return arr;
    }
    placeField(data)
    {
        data.vectors.forEach(el => {
            //calc x and y for point represented as point and vector
            const x = data.center[0]+el[0];
            const y = data.center[1]+el[1];
            //update color according to saved color 
            this.field[x + y*this.w].color = el[2];
        });
    }
    clearFilled()
    {
        //get list of the indexes of rows to be cleared
        const filled = this.getFilledRows();
        //load the field as vectors relative to a point with color as an attribute per rect
        const topOfField = [];
        //reserve known amount of memory for array to avoid copying
        topOfField.length = this.w*this.h;
        for(let y = 0; y  < this.h; y++)
        {
            for(let x = 0; x < this.w; x++)
                if(this.field[x + y*this.w].color != "#000000")  {
                    topOfField.push([x,y, this.field[x + y*this.w].color]);
                }

        }
        //create "piece" that represents the field as vectors relative to a point
        const activated = {type:"field",center:[0,0], vectors:topOfField};
        for(let y = 0; y < this.h; y++)
        {
            for(let x = 0; x < this.w; x++)
                this.field[x + y*this.w].color = "#000000";
        }
        //remove one row per iteration of loop
        for(let i = 0; i < filled.length; i ++)
        {
            const rowNum = filled[i];
            //remove vectors with y value matching filled row index to remove row at index i
            activated.vectors = activated.vectors.filter( function(item, idx) {
                return item[1] != rowNum;
            });
            //add one to all the vectors with a y mag greater than the filled row by one
            for(let i = 0; i < activated.vectors.length;i++){
                if(activated.vectors[i][1] < rowNum)
                    activated.vectors[i][1]++;
            };
        }
        //put field as vectors back into field represented as list of colors
        this.placeField(activated);
        //return count of rows removed
        return filled.length;
    }
    //places a piece on any field for drawing
    placeAny(piece, field, w)
    {
        for(let i = 0; i < piece.vectors.length; i++)
        {
            const point = [piece.vectors[i][0]+piece.center[0], piece.vectors[i][1]+piece.center[1]];
            if(point[0] + point[1]*w < field.length)
                field[point[0] + point[1]*w].color = piece.color;
        }
    }
    //places a piece on the member variable field for drawing
    place(piece)
    {
        this.placeAny(piece, this.field, this.w);
    }
    calcMaxScore(level)
    {
        return 40 * (level+1) + 100 * (level) + 300 * level * (level>2) + 1200 * level * (level > 5);
    }
    update()
    {
        if(!this.active)
            return;
        //remove colors of live piece from field for checking collision if piece is moved down
        this.clear(this.livePiece);
        //check if any rows have been cleared
        //if they are clear them, and translate rows above down
        //returns count of rows cleared
        const rowsCleared = this.clearFilled();
        //scoring sytsem
        if(rowsCleared >= 4)
        {
            this.score += 800 + 400*(this.lastRowsCleared>=4);
        }
        else
        {
            this.score += 100*rowsCleared;
        }
        //leveling system
        while(this.calcMaxScore(this.level) < this.score && this.level < this.maxLevel)
        {
            this.level++;
        }
        //check if piece can be moved down one
        if(this.isClearBelow(this.livePiece))
        {
            //move piece down one 
            this.livePiece.center[1] += 1;
        }
        else//otherwise place the current piece back on the field then draw new piece from queue
        {
            //place current piece onto screen
            this.place(this.livePiece);
            //get next live piece
            this.livePiece = this.pieceQueue.pop();
            //ensure it is in the correct position
            this.livePiece.center = [this.w/2, 1];
            this.piecePosAtTouchStart = [this.w/2, 1];
            //add new piece to queue of next pieces
            this.pieceQueue.push(this.genRandomNewPiece());
            //check if top row is full
            const topRow = {type:"none", center:[0,0],vectors:[],color:"#000000"};
            //building vectors to point to top row
            for(let i = 0; i < this.w; i++)
            {
                topRow.vectors.push([i,0]);
            }
            //use existing algorithm to check if the top row is filled
            if(!this.isClear(topRow))
            {
                //reset game
                this.gameOver();
            }
        }
        //place current live piece onto the field for drawing
        if(this.livePiece)
            this.place(this.livePiece);
        //update last row cleared count for scoring
        if(rowsCleared > 0)
            this.lastRowsCleared = rowsCleared;
    }
    
    draw()
    {
        let width = this.boundedWidth/this.w;
        let height = this.boundedHeight/this.h;
        for(let y = 0; y < this.h; y++)
        {
            for(let x = 0; x < this.w; x++)
            {
                const color = this.field[x + y*this.w].color;
                this.ctx.fillStyle = color;
                this.ctx.fillRect(x*width, y*height, width, height);
                this.ctx.strokeStyle = "#FFFFFF";
                this.ctx.strokeRect(x*width, y*height, width, height);
                if(color != "#000000")
                    this.ctx.strokeRect(x*width+width/4, y*height+height/4, width/2, height/2);
            }
        }
        width -= width/3;
        height -= height/3;
        const hoffset = 155;
        this.ctx.font = '16px Calibri';
        this.ctx.fillStyle = "#000000";
        this.ctx.fillText('Hold Piece:', 5+this.boundedWidth, 15);
        this.ctx.fillText('Score: '+this.score, 5+this.boundedWidth, 15+height*6.8);
        const levelText = this.level === (this.maxLevel-1)?"Max":this.level;
        this.ctx.fillText('Level: '+levelText, 5+this.boundedWidth, 15+height*6.8+20);
        for(let i = 0; i < this.pieceQueue.length && i < 5; i++)
        {
            let field = [];
            for(let j = 0; j < 25; j++)
                field.push({color:"#000000"});
            const piece = {type:this.pieceQueue.get(i).type,center:[2,2], vectors:this.pieceQueue.get(i).vectors, color:this.pieceQueue.get(i).color};
            
            this.placeAny(piece, field, 5);
            for(let y = 0; y < 5; y++)
            {
                for(let x = 0; x < 5; x++)
                {
                    const color = field[x + y*5].color;
                    this.ctx.fillStyle = color;
                    const gx = this.boundedWidth+5+(width)*x;
                    const gy = hoffset+(height*5.2)*i+(height)*y;
                    this.ctx.fillRect(gx, gy, width, height);
                    this.ctx.strokeStyle = "#FFFFFF";
                    this.ctx.strokeRect(gx, gy, width, height);
                    if(color != "#000000")
                        this.ctx.strokeRect(gx+width/4, gy+height/4, width/2, height/2);
                }
            }

        }
            let field = [];
            for(let j = 0; j < 25; j++)
                field.push({color:"#000000"});
            const piece = {type:this.holdPiece.type,center:[2,2], vectors:this.holdPiece.vectors, color:this.holdPiece.color};
            
            this.placeAny(piece, field, 5);
            for(let y = 0; y < 5; y++)
            {
                for(let x = 0; x < 5; x++)
                {
                    const color = field[x + y*5].color;
                    this.ctx.fillStyle = color;
                    const gx = this.boundedWidth+5+(width)*x;
                    const gy = 30+(height)*y;
                    this.ctx.fillRect(gx, gy, width, height);
                    this.ctx.strokeStyle = "#FFFFFF";
                    this.ctx.strokeRect(gx, gy, width, height);
                    if(color != "#000000")
                        this.ctx.strokeRect(gx+width/4, gy+height/4, width/2, height/2);
                }
            }
        
        
    }
    mag(a)
    {
        let sum = 0;
        for(let i = 0; i < a.length; i++)
        {
            sum += a[i]*a[i];
        }
        return Math.sqrt(sum);
    }
    normalize(a)
    {
        const magA = this.mag(a);
        for(let i = 0; i < a.length; i++)
        {
            a[i] /= magA;
        }
        return a;
    }
    dotProduct(a, b)
    {
        if(a.length != b.length)
            return false;
        let sum = 0;
        for(let i = 0; i < a.length; i++)
        {
            sum += a[i]*b[i];
        }
        return sum;
    }
    onTouchStart(event)
    {
        /*const data = {type:"start",e:[]}
        for(let a in event.touches.item(0))
        {
            data.e.push([a,event.touches.item(0)[a]])
        }
        this.logToServer(data);*/
        this.lastTouchStart = [this.touchStart, this.lastTouchTime];
        this.lastTouchTime = Date.now();
        this.touchStart = event.changedTouches.item(0);
        this.mousePos = [this.touchStart["clientX"],this.touchStart["clientY"]];
        this.piecePosAtTouchStart = [this.livePiece.center[0]*this.boundedWidth/this.w,this.livePiece.center[1]*this.boundedHeight/this.h];
        this.ignoreEndTouch = false;
        event.preventDefault();
    }
    onTouchMove(event)
    {           
        let touchMove = event.changedTouches.item(0);
        for(let i = 0; i < event.changedTouches["length"]; i++)
        {
            if(event.changedTouches.item(i).identifier == this.touchStart.identifier){
                touchMove = event.changedTouches.item(i);
            }
        } 
        if(touchMove)
        {
            const deltaY = touchMove["clientY"]-this.mousePos[1];
            const deltaX = touchMove["clientX"]-this.mousePos[0];
            this.mousePos[1] += deltaY;
            this.mousePos[0] += deltaX;

            const mag = this.mag([deltaX, deltaY]);
            const a = this.normalize([deltaX, deltaY]);
            const b = [1,0];
            const dotProduct = this.dotProduct(a, b);
            const angle = Math.acos(dotProduct)*(180/Math.PI)*(deltaY<0?1:-1);
            if(mag > 0.5 && (Math.abs(angle) >= 165 || Math.abs(angle) <= 15))
            {
                this.ignoreEndTouch = true;
                this.piecePosAtTouchStart[0] += deltaX;
                const newGridX = Math.floor(((this.piecePosAtTouchStart[0] > this.boundedWidth?this.boundedWidth:this.piecePosAtTouchStart[0])/this.boundedWidth)*this.w);

                let count = this.w;
                if(this.active)
                while(this.livePiece.center[0] != newGridX && count > 0)
                {
                    count--;
                    if(this.livePiece.center[0] < newGridX)
                    {
                        this.moveRight();
                    }
                    else
                    {
                        this.moveLeft();
                    }
                }

            }
            else if(mag > 0.3 && angle <= -65 && angle >= -115)
            {
                this.ignoreEndTouch = true;
                this.piecePosAtTouchStart[1] += deltaY*4;
                const newGridY = Math.floor(((this.piecePosAtTouchStart[1] > this.boundedHeight?this.boundedHeight:this.piecePosAtTouchStart[1])/this.boundedHeight)*this.h);
                this.clear(this.livePiece);
                while(this.livePiece.center[1] <= newGridY && this.isClearBelow(this.livePiece))
                {
                    this.livePiece.center[1]++;
                }
                this.place(this.livePiece);

            }

        }
    }
    onTouchEnd(event)
    {
        //let a = vector between start, and end
        //let b = normal vector for x [1,0]
        //normalize vect a by dividing both components by mag(a) and then take the dot product of that normalized vector a an b, then take the inverse cos
        //because mag of both will be one no need to divide by mag(a)*mag(b)
        //to get the angle, if mag is greater than some number to be defined after testing
        //then use angle to calc direction and determine what event handler to fire
        const touchEnd = event.changedTouches.item(0);
        const deltaY = touchEnd["clientY"]-this.touchStart["clientY"];
        const deltaX = touchEnd["clientX"]-this.touchStart["clientX"];
        const mag = this.mag([deltaX, deltaY]);
        const a = this.normalize([deltaX, deltaY]);
        const b = [1,0];
        const dotProduct = this.dotProduct(a, b);
        const angle = Math.acos(dotProduct)*(180/Math.PI)*(deltaY<0?1:-1);
        if(dotProduct && !this.ignoreEndTouch){
            //this.logToServer({anglew:angle, mag:mag});
            if(mag > 10)//swipe identified
            {   
                if(angle < 0)//swipe downwards
                {
                    if(Math.abs(angle) >= 45 && Math.abs(angle) <= 135)
                    {
                        this.hardDrop();
                    }
                }
                else//swipe upwards
                {
                    if(angle >= 45 && angle <= 135)
                    {
                        this.holdLive();
                    }
                }
            }
            else//tap registered
            {
                if(this.touchStart["clientX"] > this.boundedWidth)
                {
                    this.active = !this.active;
                }
                else
                {
                    this.rotate();
                }
            }
        }
        
    }
    logToServer(data)
    {
        fetch("/data", {
            method: "POST", 
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
          }).then(res => {console.log("Request complete! response:", data);});
    
    }
};
async function main()
{
   
    const canvas = document.getElementById("screen");
    const ctx = canvas.getContext("2d");
    const gridDim = 4
    
    ctx.fillStyle = "#FF0000";
    let x = 0
    //let f = Field(lines, canvas.width, gridDim, ctx)
    dim = canvas.width;
    let f = new Field(canvas, ctx, 15);
    canvas.addEventListener("click", (event) => f.onClickField(event) );
    canvas.addEventListener("mousemove",(event) => f.onMouseMove(event) );
    canvas.addEventListener('touchstart', event => f.onTouchStart(event), false);
    canvas.addEventListener('touchmove', event => f.onTouchMove(event), false);
    canvas.addEventListener('touchend', event => f.onTouchEnd(event), false);
    window.addEventListener('keydown', function(e) {
        if((e.keyCode == 32 || e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40) && e.target == document.body) {
          e.preventDefault();
          f.onKeyPress(e)
        }
        else
        {
            f.onKeyPress(e);
        }
      });
    //document.getElementById("undo").addEventListener("click", (event) => f.deleteLast())
    let count = 0;
    while(true){
        await sleep(30);
        count++;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0,0,canvas.width,canvas.height)
        ctx.fillStyle = "#FF0000";
        if(count % (f.maxLevel - f.level) == 0)
            f.update()
        f.draw()
    }
}
main();