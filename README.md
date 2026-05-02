Found it. The error is because Next.js 15 bundles React 19 internals, but @react-three/fiber@8.x (which has its own
  bundled react-reconciler) reads React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner — a field
  that no longer exists in React 19. Your package.json lists react@18.3.1, but Next 15's app router aliases react to    
  next/dist/compiled/react, which is React 19.  