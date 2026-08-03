import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmNativeSelect, HlmNativeSelectOption } from '@spartan-ng/helm/native-select';
import { CategoriesService } from './data/services/categories.service';
import { CategoryType } from './data/repositories/category.repository';

const CATEGORY_TYPES: { value: CategoryType; label: string }[] = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'transfer', label: 'Transfer' },
];

@Component({
  selector: 'app-category-edit-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmButton,
    HlmInput,
    HlmLabel,
    HlmCard,
    HlmNativeSelect,
    HlmNativeSelectOption,
  ],
  template: `
    <div class="flex justify-center p-8">
      <div hlmCard class="w-full max-w-sm p-6">
        <h1 class="mb-6 text-xl font-semibold">{{ domainId() ? 'Edit category' : 'New category' }}</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="name">Name</label>
            <input hlmInput id="name" type="text" formControlName="name" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="type">Type</label>
            <hlm-native-select [selectId]="'type'" formControlName="type">
              @for (option of categoryTypes; track option.value) {
                <option [value]="option.value" hlmNativeSelectOption>{{ option.label }}</option>
              }
            </hlm-native-select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="parentDomainId">Parent category</label>
            <hlm-native-select [selectId]="'parentDomainId'" formControlName="parentDomainId">
              <option value="" hlmNativeSelectOption>None</option>
              @for (option of parentOptions(); track option.domainId) {
                <option [value]="option.domainId" hlmNativeSelectOption>{{ option.name }}</option>
              }
            </hlm-native-select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="icon">Icon</label>
            <input hlmInput id="icon" type="text" formControlName="icon" placeholder="e.g. 🍔" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="color">Color</label>
            <input
              id="color"
              type="color"
              formControlName="color"
              class="h-8 w-16 rounded border border-input bg-transparent p-0.5"
            />
          </div>
          @if (categoriesService.saveError(); as error) {
            <p class="text-sm text-destructive">{{ error }}</p>
          }
          <div class="flex gap-2">
            <button hlmBtn type="submit" [disabled]="form.invalid || categoriesService.saving()">
              {{ categoriesService.saving() ? 'Saving…' : 'Save' }}
            </button>
            <a hlmBtn variant="outline" routerLink="/categories">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryEditPageComponent {
  protected readonly categoriesService = inject(CategoriesService);
  protected readonly categoryTypes = CATEGORY_TYPES;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly domainId = toSignal(this.route.paramMap.pipe(map((params) => params.get('domainId'))), {
    initialValue: this.route.snapshot.paramMap.get('domainId'),
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    type: ['expense' as CategoryType, Validators.required],
    parentDomainId: [''],
    icon: [''],
    color: [''],
  });

  private readonly selectedType = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });

  // Only top-level categories of the currently-selected type can be a
  // parent — filters out most invalid choices before the backend's
  // authoritative one-level-of-nesting / matching-type checks. Only matters
  // in create mode: the field is disabled once editing an existing category.
  protected readonly parentOptions = computed(() =>
    this.categoriesService.categories().filter((c) => c.type === this.selectedType() && c.parentDomainId === null),
  );

  constructor() {
    effect(() => {
      this.categoriesService.selectCategory(this.domainId());
    });

    // Changing the type invalidates any previously-chosen parent (it likely
    // belongs to the wrong type now). Only applies in create mode — in edit
    // mode `type` is disabled and this would otherwise stomp on the
    // just-loaded parentDomainId the moment patchValue below sets `type`.
    effect(() => {
      this.selectedType();
      if (!this.domainId()) {
        this.form.controls.parentDomainId.setValue('');
      }
    });

    effect(() => {
      const category = this.categoriesService.category();
      if (category) {
        this.form.patchValue({
          name: category.name,
          type: category.type,
          parentDomainId: category.parentDomainId ?? '',
          icon: category.icon ?? '',
          color: category.color ?? '',
        });
        this.form.controls.type.disable();
        this.form.controls.parentDomainId.disable();
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    const { name, type, parentDomainId, icon, color } = this.form.getRawValue();
    const domainId = this.domainId();
    const save = domainId
      ? this.categoriesService.updateCategory(domainId, {
          name,
          icon: icon || undefined,
          color: color || undefined,
        })
      : this.categoriesService.createCategory({
          name,
          type,
          parentDomainId: parentDomainId || undefined,
          icon: icon || undefined,
          color: color || undefined,
        });
    save.then(() => this.router.navigateByUrl('/categories'));
  }
}
