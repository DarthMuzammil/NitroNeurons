import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import { useStore } from "./components/store";
import { Joystick } from "react-joystick-component";
import PropTypes from 'prop-types';

// Constants
const ITEM_IMAGES = {
  banana: "./images/banana.webp",
  mushroom: "./images/mushroom.png",
  shell: "./images/shell.webp",
};

const JOYSTICK_CONFIG = {
  size: 100,
  sticky: false,
  baseColor: "rgba(255, 255, 255, 0.5)",
  stickColor: "rgba(255, 255, 255, 0.5)",
};

// Memoized Item Display Component
const ItemDisplay = memo(({ image }) => (
  <div className="item" role="status" aria-label="Current item">
    <div className="borderOut">
      <div className="borderIn">
        <div className="background">
          {image && (
            <img 
              src={image} 
              alt="Current game item" 
              width={90} 
              onError={(e) => {
                e.target.src = ""; // Clear broken image
                console.error(`Failed to load item image: ${image}`);
              }}
            />
          )}
        </div>
      </div>
    </div>
  </div>
));

ItemDisplay.propTypes = {
  image: PropTypes.string
};

// Control Button Component
const ControlButton = memo(({ label, onPress, onRelease }) => (
  <div
    className={`controls ${label.toLowerCase()}`}
    role="button"
    tabIndex={0}
    aria-label={label}
    onMouseDown={onPress}
    onMouseUp={onRelease}
    onTouchStart={(e) => {
      e.preventDefault();
      onPress(e);
    }}
    onTouchEnd={(e) => {
      e.preventDefault();
      onRelease(e);
    }}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        onPress(e);
      }
    }}
    onKeyUp={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        onRelease(e);
      }
    }}
  >
    {label}
  </div>
));

ControlButton.propTypes = {
  label: PropTypes.string.isRequired,
  onPress: PropTypes.func.isRequired,
  onRelease: PropTypes.func.isRequired,
};

export const HUD = () => {
  const wheel = useRef();
  const [image, setImage] = useState("");
  const { item, gameStarted, actions, controls } = useStore();

  // Memoized handlers
  const handleMove = useCallback((e) => {
    actions.setJoystickX(e.x);
  }, [actions]);

  const handleStop = useCallback(() => {
    actions.setJoystickX(0);
  }, [actions]);

  const createButtonHandlers = useCallback((action) => ({
    onPress: () => action(true),
    onRelease: () => action(false)
  }), []);

  // Mouse movement effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!wheel.current) return;

      const { clientX, clientY } = e;
      const screenWidth = window.innerWidth;
      const rotation = ((clientX - screenWidth / 2) / screenWidth) * 180;

      wheel.current.style.left = `${clientX - 100}px`;
      wheel.current.style.top = `${clientY - 100}px`;
      wheel.current.style.transform = `rotate(${rotation}deg)`;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Item image effect
  useEffect(() => {
    setImage(ITEM_IMAGES[item] || "");
  }, [item]);

  if (!gameStarted) return null;

  return (
    <div className="overlay" role="region" aria-label="Game HUD">
      <ItemDisplay image={image} />
      
      {controls === "touch" && (
        <>
          <div className="controls joystick" role="group" aria-label="Movement controls">
            <Joystick
              {...JOYSTICK_CONFIG}
              move={handleMove}
              stop={handleStop}
            />
          </div>

          <ControlButton 
            label="drift"
            {...createButtonHandlers(actions.setDriftButton)}
          />

          <ControlButton 
            label="item"
            {...createButtonHandlers(actions.setItemButton)}
          />

          <ControlButton 
            label="menu"
            {...createButtonHandlers(actions.setMenuButton)}
          />
        </>
      )}
    </div>
  );
};

// Add component prop types
HUD.propTypes = {
  // Add any props if needed in the future
};
