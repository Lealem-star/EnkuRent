import React from 'react';
import { useAuth } from '../context/AuthContext';

export const BuildingSwitcher = () => {
  const { buildings, activeBuildingId, setActiveBuildingId, user, role } = useAuth();

  // If user is a manager, only show assigned buildings
  let accessible = buildings;
  if (role === 'MANAGER' && user?.buildingIds) {
    accessible = buildings.filter((b) => user.buildingIds.includes(b.id));
  }

  return (
    <div className="bld-switch">
      <select
        value={activeBuildingId}
        onChange={(e) => setActiveBuildingId(e.target.value)}
        aria-label="Filter by Property"
      >
        {role !== 'MANAGER' || !user?.buildingIds || user.buildingIds.length > 1 ? (
          <option value="__all__">All Properties</option>
        ) : null}
        {accessible.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default BuildingSwitcher;

