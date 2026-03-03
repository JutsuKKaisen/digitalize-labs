// types/react-cytoscapejs.d.ts
declare module 'react-cytoscapejs' {
  import * as React from 'react';

  export type CytoscapeComponentProps = React.PropsWithChildren<{
    /** Cytoscape elements array or stylesheet-like shape */
    elements?: any;
    /** Cytoscape stylesheet */
    stylesheet?: any;

    /** Cytoscape layout config */
    layout?: any;

    /** Called with the Cytoscape instance */
    cy?: (cy: any) => void;

    /** Called when ready (some versions use 'onReady' naming) */
    onReady?: (cy: any) => void;

    /** Zooming & panning props (pass-through) */
    zoom?: number;
    pan?: any;
    minZoom?: number;
    maxZoom?: number;
    zoomingEnabled?: boolean;
    userZoomingEnabled?: boolean;
    panningEnabled?: boolean;
    userPanningEnabled?: boolean;

    /** Styling */
    style?: React.CSSProperties;
    className?: string;

    /** Any other props forwarded to component */
    [key: string]: any;
  }>;

  const CytoscapeComponent: React.ComponentType<CytoscapeComponentProps>;
  export default CytoscapeComponent;
}
// types/react-cytoscapejs.d.ts