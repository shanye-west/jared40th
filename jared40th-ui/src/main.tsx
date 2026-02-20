import React, { lazy, useState } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import "./firebase";
import { TournamentProvider } from "./contexts/TournamentContext";
import { LayoutProvider } from "./contexts/LayoutContext";
import App from "./App";
import ErrorBoundary, { NotFound } from "./components/ErrorBoundary";
import { LayoutShell } from "./components/Layout";
import SplashScreen from "./components/SplashScreen";

const Group = lazy(() => import("./routes/Group"));
const Teams = lazy(() => import("./routes/Teams"));
const Games = lazy(() => import("./routes/Games"));
const Admin = lazy(() => import("./routes/Admin"));

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <LayoutShell />,
      errorElement: (
        <LayoutShell>
          <ErrorBoundary />
        </LayoutShell>
      ),
      children: [
        { index: true, element: <App /> },
        { path: "group/:groupId", element: <Group /> },
        { path: "teams", element: <Teams /> },
        { path: "games", element: <Games /> },
        { path: "admin", element: <Admin /> },
        { path: "*", element: <NotFound /> },
      ],
    },
  ],
  {
    future: {
      v7_skipActionErrorRevalidation: true,
    },
  }
);

function Root() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      <TournamentProvider>
        <LayoutProvider>
          <RouterProvider router={router} />
        </LayoutProvider>
      </TournamentProvider>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
