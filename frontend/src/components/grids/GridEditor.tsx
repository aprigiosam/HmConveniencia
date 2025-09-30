import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export const GridEditor = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-9">
          <div className="grid grid-cols-10 gap-2">
            {/* Grid cells will be rendered here */}
            {Array.from({ length: 50 }).map((_, index) => (
              <div key={index} className="h-24 rounded-md border-2 border-dashed border-slate-300 bg-slate-100"></div>
            ))}
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-md bg-white p-4 shadow-md">
            <h3 className="mb-4 text-lg font-semibold">Produtos</h3>
            <ul>
              {/* Product list will be rendered here */}
              <li className="cursor-move rounded-md border p-2 hover:bg-slate-100">Produto 1</li>
              <li className="cursor-move rounded-md border p-2 hover:bg-slate-100">Produto 2</li>
              <li className="cursor-move rounded-md border p-2 hover:bg-slate-100">Produto 3</li>
            </ul>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};
