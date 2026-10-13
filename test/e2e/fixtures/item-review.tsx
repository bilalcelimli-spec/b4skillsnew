import React from 'react';
import {createRoot} from 'react-dom/client';
import {ContentFactoryReviewQueue} from '../../../src/components/admin/ContentFactoryReviewQueue';
import '../../../src/index.css';
createRoot(document.getElementById('root')!).render(<main className="p-4"><ContentFactoryReviewQueue/></main>);
