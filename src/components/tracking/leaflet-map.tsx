"use client";

/**
 * LeafletMap — lazy-loaded interactive map.
 * Uses OpenStreetMap tiles (free, no API key).
 *
 * ⚠️ This file must be loaded only on client-side (no SSR).
 */

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Leaflet + bundlers)
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LeafletMapProps {
  passengerCoord: { lat: number; lng: number; accuracy: number; timestamp: number };
  busCoord?: { lat: number; lng: number };
  quayCoord?: { lat: number; lng: number; label?: string };
  passengerName?: string;
  /** Center mode: 'passenger' (default) or 'quay' */
  centerOn?: "passenger" | "quay";
}

export default function LeafletMap({
  passengerCoord,
  busCoord,
  quayCoord,
  passengerName,
  centerOn = "passenger",
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const passengerMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const quayMarkerRef = useRef<L.Marker | null>(null);

  // ─── Initialize map once ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([passengerCoord.lat, passengerCoord.lng], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Force invalidateSize after mount (Next.js layout shift fix)
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      passengerMarkerRef.current = null;
      accuracyCircleRef.current = null;
      busMarkerRef.current = null;
      quayMarkerRef.current = null;
    };
  }, []);

  // ─── Update passenger marker ──────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    const lat = passengerCoord.lat;
    const lng = passengerCoord.lng;

    // Custom passenger icon (divIcon with emoji)
    const passengerIcon = L.divIcon({
      className: "passenger-marker",
      html: `<div style="font-size: 28px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🧍</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (!passengerMarkerRef.current) {
      passengerMarkerRef.current = L.marker([lat, lng], { icon: passengerIcon })
        .addTo(mapRef.current)
        .bindPopup(`<strong>${passengerName ?? "Vous"}</strong><br/>Position actuelle`);
    } else {
      passengerMarkerRef.current.setLatLng([lat, lng]);
    }

    // Accuracy circle
    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = L.circle([lat, lng], {
        radius: passengerCoord.accuracy || 50,
        color: "#F97316",
        fillColor: "#F97316",
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(mapRef.current);
    } else {
      accuracyCircleRef.current.setLatLng([lat, lng]);
      accuracyCircleRef.current.setRadius(passengerCoord.accuracy || 50);
    }

    // Center map on passenger if requested
    if (centerOn === "passenger") {
      mapRef.current.panTo([lat, lng], { animate: true });
    }
  }, [passengerCoord, passengerName, centerOn]);

  // ─── Update bus marker ────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !busCoord) return;

    const busIcon = L.divIcon({
      className: "bus-marker",
      html: `<div style="font-size: 28px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🚌</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (!busMarkerRef.current) {
      busMarkerRef.current = L.marker([busCoord.lat, busCoord.lng], { icon: busIcon })
        .addTo(mapRef.current)
        .bindPopup("<strong>Bus</strong>");
    } else {
      busMarkerRef.current.setLatLng([busCoord.lat, busCoord.lng]);
    }
  }, [busCoord]);

  // ─── Update quay marker ───────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !quayCoord) return;

    const quayIcon = L.divIcon({
      className: "quay-marker",
      html: `<div style="font-size: 28px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">📍</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (!quayMarkerRef.current) {
      quayMarkerRef.current = L.marker([quayCoord.lat, quayCoord.lng], { icon: quayIcon })
        .addTo(mapRef.current)
        .bindPopup(`<strong>Quai</strong>${quayCoord.label ? `<br/>${quayCoord.label}` : ""}`);
    } else {
      quayMarkerRef.current.setLatLng([quayCoord.lat, quayCoord.lng]);
    }

    // Fit bounds to show both passenger and quay
    if (centerOn === "quay") {
      mapRef.current.panTo([quayCoord.lat, quayCoord.lng], { animate: true });
    }
  }, [quayCoord, centerOn]);

  return <div ref={containerRef} className="w-full h-full" />;
}
