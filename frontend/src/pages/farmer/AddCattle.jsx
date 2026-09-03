import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessage';
import { Camera } from 'lucide-react';
import { cattleApi } from '../../api/cattleApi';

export default function AddCattle() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [form, setForm] = useState({
    name: '',
    breed: '',
    gender: 'FEMALE',
    dateOfBirth: '',
    estimatedAgeYears: '',
    color: '',
    identifyingMarks: '',
    stateCode: '',
  });
  const [photoFile, setPhotoFile] = useState(null);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== '') formData.append(key, value);
      });
      if (photoFile) formData.append('photo', photoFile);

      const { data } = await cattleApi.add(formData);
      toast.success(`${data.cattle.name} registered as ${data.cattle.cattleId}`);
      navigate(`/farmer/cattle/${data.cattle._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not add cattle.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="font-display text-xl font-medium text-ink-900">Add Cattle</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-mist-200 bg-white p-5 shadow-sm">
        <div className="flex justify-center">
          <label className="relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-pasture-300 bg-pasture-50">
            {photoPreview ? (
              <img src={photoPreview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <Camera className="text-pasture-500" size={24} />
            )}
            <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </label>
        </div>

        <Field label="Cattle name" required>
          <input
            required
            value={form.name}
            onChange={update('name')}
            className="input"
            placeholder="e.g. Lakshmi"
          />
        </Field>

        <Field label="Breed">
          <input value={form.breed} onChange={update('breed')} className="input" placeholder="e.g. Gir" />
        </Field>

        <Field label="Gender" required>
          <div className="grid grid-cols-2 gap-2">
            {['FEMALE', 'MALE'].map((g) => (
              <button
                type="button"
                key={g}
                onClick={() => setForm({ ...form, gender: g })}
                className={`rounded-lg border py-2 text-sm font-medium capitalize ${
                  form.gender === g
                    ? 'border-pasture-600 bg-pasture-50 text-pasture-700'
                    : 'border-mist-300 text-ink-600'
                }`}
              >
                {g.toLowerCase()}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of birth">
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={update('dateOfBirth')}
              className="input"
            />
          </Field>
          <Field label="Estimated age (yrs)">
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.estimatedAgeYears}
              onChange={update('estimatedAgeYears')}
              className="input"
            />
          </Field>
        </div>

        <Field label="Color / identifying characteristics">
          <input value={form.color} onChange={update('color')} className="input" placeholder="e.g. Brown & white" />
        </Field>

        <Field label="Other identifying marks">
          <textarea
            value={form.identifyingMarks}
            onChange={update('identifyingMarks')}
            className="input min-h-[70px]"
            placeholder="Any notable marks or features"
          />
        </Field>

        <Field label="State code (for cattle ID)">
          <input
            value={form.stateCode}
            onChange={update('stateCode')}
            maxLength={2}
            className="input uppercase"
            placeholder="e.g. KA"
          />
        </Field>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full btn-pop py-2.5 text-sm disabled:opacity-60"
        >
          {isSubmitting ? 'Registering...' : 'Register Cattle & Generate ID'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink-700">
        {label} {required && <span className="text-vital-500">*</span>}
      </span>
      {children}
    </label>
  );
}
