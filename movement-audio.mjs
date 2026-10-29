export class FootstepTracker {
    constructor(){this.previous=null;this.distance=0;this.grounded=true;this.fallSpeed=0;}
    update(position,{active,grounded,quiet,verticalSpeed=0}) {
        const previous=this.previous;this.previous={x:position.x,z:position.z};
        if(!active){this.distance=0;this.grounded=grounded;this.fallSpeed=0;return null;}
        const landing=!this.grounded&&grounded&&this.fallSpeed<-4;
        this.grounded=grounded;
        if(!grounded){this.distance=0;this.fallSpeed=Math.min(this.fallSpeed,verticalSpeed);return null;}
        this.fallSpeed=0;
        if(landing){this.distance=0;return 'land';}
        if(quiet||!previous){this.distance=0;return null;}
        const traveled=Math.hypot(position.x-previous.x,position.z-previous.z);
        if(traveled>4){this.distance=0;return null;} // Teleport/dash is not a footfall.
        this.distance+=traveled;
        if(this.distance>=2.2){this.distance%=2.2;return 'step';}
        return null;
    }
}
