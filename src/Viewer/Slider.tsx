import React from 'react';

interface SliderProps {
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({ min, max, step, value, onChange }) => {
    return (
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="range range-primary range-sm"
        />
    );
};