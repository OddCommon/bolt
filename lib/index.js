import Eventful from "./eventful";

class BoltRouter extends Eventful {
    constructor(){
        super();
        this.action = ( window.ontouchstart === null ) ? 'touchstart' : 'click';

        this.links = [];
        this.staticElements = [];
        this.intercept = null;
        
        this.pause = () => {
            this._pause();
        }
        this.resume = () => {
            this._resume();
        }

        this.prefetch = (e) => {
            this._prefetch(e);
        }

        this.navigate = async (event) => {
            
            // Handle keys natively
            if( event.shiftKey || event.ctrlKey || event.altKey || event.metaKey ) {
                return;
            } else {
                event.preventDefault();
                if( event.target.href === window.location.href || this.intercept ) return;
                this.emit("common:before-navigate");
                this._navigate(event);
            }
        }

        this.dispose = () => {
            this._dispose();
        }

        this.observe = () => {
            this._observe();
        }
        
        window.addEventListener('popstate', (event) => {
            if( history?.state?.payload ){
                this.emit("common:before-navigate");
                this._render(history.state.payload);
            } else {
                history.back();
            }
        });
        
        // Listen
        this._initialize();
    }

    _pause(){
        this.intercept = new Promise((resolve) => { this.interceptResolve = resolve });
    }

    _resume(){
        if( this.interceptResolve ) this.interceptResolve();
        this.intercept = null;
    }

    _initialize() {
        // Dispose of any existing listeners
        this.dispose();

        this.staticElements = [];
        this.staticElements = [...document.querySelectorAll('[data-Boltrouter-static]')];
       
        // Listen
        this.observe();
    }

    _observe(){
        // Empty links & Query
        this.links = [];
        this.links = [...document.querySelectorAll('a[data-router-link]')].map( (link) => {
            return {
                element: link,
                url: link.href,
                payload: null
            }
        });

        // Attach listeners
        this.links.map( (link) => {
            if( window.ontouchstart !== null ) {
                link.element.addEventListener('mouseover', this.prefetch );
            }
            link.element.addEventListener(this.action, this.navigate);
        });
    }

    _prefetch(event){

        // Find the link in our list
        const link = this.links.find((l) => l.url === event.target.href);

        if( link.payload ){
            return link.payload;
        } else {
            return new Promise(async (resolve) => {
                this.emit("common:before-prefetch", {url: event.target.href});
                
                // Remove the listener
                event.target.removeEventListener('mouseover', this.prefetch );
                
                // Fetch the page
                const payload = await fetch(event.target.href, {credentials: `include`});
                link.payload = await payload.text();

                resolve(link.payload);
                this.emit("common:prefetch-complete", {url: event.target.href, payload: link.payload});
            })
        }
    }

    async _navigate(event){
        if( this.intercept ) await this.intercept
        const payload = await this._prefetch(event);
        const link = this.links.find((l) => l.url === event.target.href);

        this.emit("common:navigate-complete");
        window.history.pushState({payload: payload}, '', link.url);
        this._render(payload);
    }

    async _render(html){
        const parser = new DOMParser();

        // Old Page
        const routerWrapper = document.querySelector('[data-router]');
        const oldPageTitle = document.querySelector('title');
        const oldPageScripts = [...document.querySelectorAll('script')];
        const oldPageMeta = [...document.querySelectorAll('meta')];
        const oldPageLink = [...document.querySelectorAll('link')];

        // New page
        const newPage = parser.parseFromString(html, 'text/html');
        const newRouterWrapper = newPage.querySelector('[data-router]');
        const newPageTitle = newPage.querySelector('title');
        const newPageScripts = [...newPage.querySelectorAll('script')];
        const newPageMeta = [...newPage.querySelectorAll('meta')];
        const newPageLink = [...newPage.querySelectorAll('link')];

        // Change the dom
        oldPageMeta.forEach( (meta) => meta.remove() );
        // oldPageLink.forEach( (link) => link.remove() );
        
        newPageMeta.forEach( (meta) => document.head.appendChild(meta) );
        // newPageLink.forEach( (link) => document.head.appendChild(link) );

        this.emit('common:loading');
        if( this.intercept ) await this.intercept;

        this.emit("common:before-render");
        if( this.intercept ) await this.intercept;

        // Swap Router Content & Update Title
        routerWrapper.remove();
        document.body.appendChild(newRouterWrapper);
        oldPageTitle.innerText = newPageTitle.innerText;

        // Initialize
        this._initialize();
        this.emit("common:render-complete");
        if( this.intercept ) await this.intercept;
        
        // Remove old Scripts
        oldPageScripts.map( (oldScript) => {
            let oldScriptSrc = oldScript.src;
            const retain = newPageScripts.find( (newScript) => newScript.src === oldScriptSrc );
            if( !retain ){ oldScript.remove(); }
        });

        // Inject new Scripts
        const newScripts = [];
        let scriptsLoaded = 0;
        newPageScripts.map( (newScript) => {
            const newScriptSrc = newScript.src;
            const retain = oldPageScripts.find( (oldScript) => oldScript.src === newScriptSrc);
            if( !retain ){
                newScripts.push( 
                    new Promise( (resolve, reject) => {
                        const separator = newScriptSrc.indexOf('?') > -1 ? '&' : '?'
                        const cache = newScriptSrc.indexOf('html-proxy') > -1 ? '' : `${separator}v=${Math.round(Math.random() * 1000)}`
                        const script = document.createElement('script');
                        script.onload = () => { resolve() };
                        script.type = "module";
                        script.src = `${newScriptSrc}${cache}`;
                        document.head.appendChild(script);
                    }).then( () => {
                        scriptsLoaded++;
                        this.emit('common:load-event', {total: newScripts.length, complete: scriptsLoaded})
                    })
                )
            }
        });

        this.emit('common:load-event', {total: newScripts.length, complete: 0})
        await Promise.all(newScripts);
        this.emit('common:load-complete');
    }

    _dispose(){
        this.links.forEach( (link) => {
            link.element.removeEventListener('mouseover', this.prefetch);
        });
    }
}
if( window ){
    window.BoltRouter = new BoltRouter();
}
export default BoltRouter;