import { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import "./profile-avatar.css";

const API_ORIGIN = "http://127.0.0.1:5000";
const avatarSrc = (url) => !url ? "" : url.startsWith("http") ? url : `${API_ORIGIN}${url}`;

function Profile() {
  const { user, checkUser } = useAuth();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) setFormData({ name: user.name || "", email: user.email || "", password: "" });
  }, [user]);

  useEffect(() => {
    if (!selectedImage) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(selectedImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  const handleChange = (e) => {
    setFormData((previous) => ({ ...previous, [e.target.name]: e.target.value }));
    setMessage(""); setError("");
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    setMessage(""); setError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Select a JPG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Profile photo must be smaller than 3 MB.");
      e.target.value = "";
      return;
    }
    setSelectedImage(file);
  };

  const handleAvatarUpload = async () => {
    if (!selectedImage) { setError("Please select a photo first."); return; }
    setUploading(true); setError(""); setMessage("");
    try {
      const body = new FormData();
      body.append("file", selectedImage);
      const response = await api.post("/me/avatar", body);
      await checkUser();
      setSelectedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage(response.data.message || "Profile photo uploaded successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to upload profile photo.");
    } finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { setError("Name is required."); return; }
    if (!formData.email.trim()) { setError("Email is required."); return; }
    if (formData.password && formData.password.length < 6) {
      setError("New password must contain at least 6 characters."); return;
    }
    try {
      setLoading(true); setMessage(""); setError("");
      const payload = { name: formData.name.trim(), email: formData.email.trim() };
      if (formData.password) payload.password = formData.password;
      const response = await api.put("/me", payload);
      setMessage(response.data.message || "Profile updated successfully.");
      setFormData((previous) => ({ ...previous, password: "" }));
      await checkUser();
    } catch (err) {
      console.error("Profile Update Error:", err.response?.data || err);
      setError(err.response?.data?.message || "Unable to update profile.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <Navbar />
      <main className="dashboard-container">
        <section className="welcome-section">
          <div><p className="eyebrow">Account Settings</p><h1>My Profile</h1><p>Manage your EDABIP account information.</p></div>
          <span className="role-badge">{user?.role || "user"}</span>
        </section>
        <section className="profile-layout">
          <div className="dashboard-card profile-summary">
            <div className="profile-avatar avatar-photo-wrapper">
              {previewUrl || user?.avatar_url ? (
                <img className="avatar-photo" src={previewUrl || avatarSrc(user.avatar_url)} alt="Profile avatar" />
              ) : (user?.name?.charAt(0)?.toUpperCase() || "U")}
            </div>
            <h2>{user?.name || "User"}</h2>
            <p>{user?.email}</p>
            <span className="profile-role">{user?.role}</span>
            <div className="avatar-upload-section">
              <h3>Profile Photo</h3>
              <label className="avatar-file-label" htmlFor="avatar-file">Choose Photo</label>
              <input ref={fileInputRef} id="avatar-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} />
              <small>JPG, PNG or WebP · Maximum 3 MB</small>
              {selectedImage && <p className="avatar-file-name">Selected: {selectedImage.name}</p>}
              <button type="button" className="profile-save-btn avatar-upload-btn" disabled={!selectedImage || uploading} onClick={handleAvatarUpload}>
                {uploading ? "Uploading..." : "Upload Photo"}
              </button>
            </div>
          </div>
          <div className="dashboard-card profile-form-card">
            <div className="card-header"><div><h3>Profile Information</h3><p>Update your name, email or password.</p></div></div>
            <form className="profile-form" onSubmit={handleSubmit}>
              <div className="form-group"><label htmlFor="profile-name">Full Name</label><input id="profile-name" type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your name" /></div>
              <div className="form-group"><label htmlFor="profile-email">Email Address</label><input id="profile-email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" /></div>
              <div className="form-group"><label htmlFor="profile-password">New Password</label><input id="profile-password" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Leave blank to keep current password" /><small>Leave this field empty if you don't want to change your password.</small></div>
              {message && <div className="upload-success" role="status">{message}</div>}
              {error && <div className="login-error" role="alert">{error}</div>}
              <button type="submit" className="profile-save-btn" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}

export default Profile;
